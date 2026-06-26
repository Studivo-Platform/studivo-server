const { ApiError }     = require('../utils/ApiError');
const { ApiResponse }  = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const notificationRepo = require('../repositories/notification.repository');

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await notificationRepo.findByUser(req.user._id, { page, limit });

  return res.json(new ApiResponse(200, result));
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationRepo.markRead(req.params.id, req.user._id);

  if (!notification) throw new ApiError(404, 'Notification not found');

  return res.json(new ApiResponse(200, notification, 'Notification marked as read'));
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const count = await notificationRepo.markAllRead(req.user._id);

  return res.json(new ApiResponse(200, { updated: count }, 'All notifications marked as read'));
});

module.exports = { getNotifications, markRead, markAllRead };