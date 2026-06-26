const { Notification } = require('../models/Notification');

const create = async (data) => {
  return Notification.create(data);
};

// Get notifications for a user — unread first, then by date
const findByUser = async (userId, { page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification
      .find({ userId })
      .sort({ read: 1, createdAt: -1 })  // unread (false=0) first
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return { notifications, total, unreadCount, page, limit };
};

// Mark one notification as read
const markRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
};

// Mark all unread notifications for a user as read
const markAllRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
  return result.modifiedCount;
};

module.exports = { create, findByUser, markRead, markAllRead };