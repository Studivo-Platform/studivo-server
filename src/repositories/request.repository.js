const { Request } = require('../models/Request');

// Create a new request document
const create = async (data) => {
  return Request.create(data);
};

// Find single request by ID — with offers and scraped results populated
const findById = async (id) => {
  return Request
    .findById(id)
    .populate('userId', 'name email profileImage')   // Basic user info only
    .lean();  // .lean() returns plain JS object (faster, no mongoose methods)
};

// Get all requests for a specific student (paginated)
const findByUser = async (userId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    Request
      .find({ userId })
      .sort({ createdAt: -1 })  // Newest first
      .skip(skip)
      .limit(limit)
      .lean(),
    Request.countDocuments({ userId }),
  ]);

  return { requests, total, page, limit };
};

// Get open requests filtered by category (for seller dashboard)
const findOpen = async ({ category, page = 1, limit = 10 }) => {
  const skip   = (page - 1) * limit;
  const filter = { status: 'open' };
  if (category) filter['parsedData.category'] = category;

  const [requests, total] = await Promise.all([
    Request
      .find(filter)
      .populate('userId', 'name university')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Request.countDocuments(filter),
  ]);

  return { requests, total, page, limit };
};

// Update request status
const updateStatus = async (id, status) => {
  return Request.findByIdAndUpdate(id, { status }, { new: true });
};

// Increment view count
const incrementViews = async (id) => {
  return Request.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
};

module.exports = { create, findById, findByUser, findOpen, updateStatus, incrementViews };