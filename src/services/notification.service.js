const notificationRepo = require('../repositories/notification.repository');
const { getIO }        = require('../socket/index');

// Create notification in DB and emit to user via Socket.IO
const createAndEmit = async ({ userId, type, message, resourceId, resourceType }) => {
  try {
    // 1. Save to DB
    const notification = await notificationRepo.create({
      userId,
      type,
      message,
      resourceId:   resourceId   || null,
      resourceType: resourceType || null,
    });

    // 2. Emit real-time to user's personal Socket.IO room
    try {
      const io = getIO();
      io.to(`user:${userId.toString()}`).emit('new_notification', { notification });
    } catch {
      // Socket might not be initialized in test env — skip silently
    }

    return notification;
  } catch (error) {
    // Don't throw — notifications are non-critical
    // A failed notification should never break the main request flow
    console.error('[Notification] Failed to create:', error.message);
    return null;
  }
};

module.exports = { createAndEmit };