const { ApiError }     = require('../utils/ApiError');
const { ApiResponse }  = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const conversationRepo = require('../repositories/conversation.repository');
const messageRepo      = require('../repositories/message.repository');
const requestRepo      = require('../repositories/request.repository');

// POST /api/conversations
// Start a conversation between student and seller
// Called when student clicks "Chat" on an offer
const createConversation = asyncHandler(async (req, res) => {
  const { requestId, sellerId, offerId } = req.body;
  const studentId = req.user._id.toString();

  // Verify the request exists
  const request = await requestRepo.findById(requestId);
  if (!request) throw new ApiError(404, 'Request not found');

  // Student can only start conversation for their own request
  console.log(` re -> ${request.userId._id.toString()} ${studentId}`);
  if (request.userId._id.toString() !== studentId) {
    throw new ApiError(403, 'You can only start a conversation for your own request');
  }

  // findOrCreate: returns existing or creates new (no duplicate conversations)
  const conversation = await conversationRepo.findOrCreate({
    participants: [studentId, sellerId],
    requestId,
    offerId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, conversation, 'Conversation started'));
});

// GET /api/conversations/my
// Get all conversations for the logged-in user
const getMyConversations = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await conversationRepo.findByUser(req.user._id, { page, limit });

  return res.json(new ApiResponse(200, result));
});

// GET /api/conversations/:id/messages
// Get paginated message history for a conversation
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify user is a participant
  const conversation = await conversationRepo.findByIdAndParticipant(id, req.user._id);
  if (!conversation) throw new ApiError(404, 'Conversation not found or access denied');

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;

  const result = await messageRepo.findByConversation(id, { page, limit });

  // Mark messages as read when fetching history via HTTP
  messageRepo.markAsRead(id, req.user._id).catch(() => {});

  return res.json(new ApiResponse(200, result));
});

module.exports = { createConversation, getMyConversations, getMessages };