const notificationRepo = require('../repositories/notification.repository');

// Create notification in DB and optionally emit through the transport provided by the caller.
const createAndEmit = async ({ userId, type, message, resourceId, resourceType, io }) => {
  try {
    const notification = await notificationRepo.create({
      userId,
      type,
      message,
      resourceId:   resourceId   || null,
      resourceType: resourceType || null,
    });

    if (io) {
      try {
        io.to(`user:${userId.toString()}`).emit('new_notification', { notification });
      } catch (error) {
        console.error('[Notification] Failed to emit:', error.message);
      }
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
