const { ApiError }      = require('../utils/ApiError');
const { ApiResponse }   = require('../utils/ApiResponse');
const { asyncHandler }  = require('../utils/asyncHandler');
const { parseRequest }  = require('../services/ai.service');
const { addScrapeJob }  = require('../services/queue.service');
const requestRepo       = require('../repositories/request.repository');

//  POST /api/requests
// Student creates a new request.
// Flow: validate → AI parse → save → queue scrape job → respond
const createRequest = asyncHandler(async (req, res) => {
  const { rawText, categoryHint, budget } = req.body;
  const userId = req.user._id;

  // 1. Parse the request text with AI (or cache/fallback engine if OpenAI fails)
  const { parsedData, fromCache, usedFallback } = await parseRequest(rawText);

  // 2. Merge categoryHint and budget from the student (manual overrides AI)
  if (categoryHint)     parsedData.category = categoryHint;
  if (budget?.max)      parsedData.budget.max = budget.max;
  if (budget?.min)      parsedData.budget.min = budget.min;

  // 3. Save to MongoDB
  const request = await requestRepo.create({
    userId,
    rawText,
    parsedData,
  });

  // 4. Queue a scrape job in the background (non-blocking)
  // Don't await — let it happen asynchronously
  addScrapeJob(request._id, parsedData).catch((err) =>
    console.error('[Request] Failed to add scrape job:', err.message)
  );

  // 5. Emit Socket.IO event to notify sellers in this category
  // req.io is attached in server.js
  if (req.io) {
    req.io.to(parsedData.category).emit('new_request', {
      requestId: request._id,
      category:  parsedData.category,
      summary:   rawText.slice(0, 100),
      budget:    parsedData.budget,
    });
  }

  return res.status(201).json(
    new ApiResponse(201, {
      request,
      meta: { fromCache, usedFallback: usedFallback || false },
    }, 'Request posted successfully. Finding offers...')
  );
});

// GET /api/requests/my
// Student sees their own requests (paginated)
const getMyRequests = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await requestRepo.findByUser(req.user._id, { page, limit });

  return res.json(new ApiResponse(200, result));
});

// GET /api/requests/:id
// Get single request with full details
// Both students and sellers can access — but we increment views
const getById = asyncHandler(async (req, res) => {
  const request = await requestRepo.findById(req.params.id);

  if (!request) throw new ApiError(404, 'Request not found');

  // Increment view count in background (don't block the response)
  requestRepo.incrementViews(req.params.id).catch(() => {});

  return res.json(new ApiResponse(200, request));
});

// GET /api/requests
// Seller sees open requests filtered by category
const getOpenRequests = asyncHandler(async (req, res) => {
  const { category }  = req.query;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await requestRepo.findOpen({ category, page, limit });

  return res.json(new ApiResponse(200, result));
});

// PATCH /api/requests/:id/status
// Student closes their own request
const closeRequest = asyncHandler(async (req, res) => {
  const request = await requestRepo.findById(req.params.id);

  if (!request) throw new ApiError(404, 'Request not found');

  // Only the owner can close their request
  if (request.userId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only close your own requests');
  }

  if (request.status === 'closed') {
    throw new ApiError(400, 'Request is already closed');
  }

  const updated = await requestRepo.updateStatus(req.params.id, 'closed');

  return res.json(new ApiResponse(200, updated, 'Request closed successfully'));
});

module.exports = { createRequest, getMyRequests, getById, getOpenRequests, closeRequest };