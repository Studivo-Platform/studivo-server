const { Message } = require('../models/Message');

// Save a new message
const create = async (data) => {
  const msg = await Message.create(data);
  // Populate sender info for the response
  return msg.populate('senderId', 'name profileImage');
};

// Get paginated messages for a conversation (oldest first)
const findByConversation = async (conversationId, { page = 1, limit = 50 }) => {
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message
      .find({ conversationId })
      .populate('senderId', 'name profileImage')
      .sort({ createdAt: 1 })    // Oldest first (natural chat order)
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversationId }),
  ]);

  return { messages, total, page, limit };
};

// Mark all unread messages in a conversation as read
// Only marks messages NOT sent by the current user
const markAsRead = async (conversationId, userId) => {
  const result = await Message.updateMany(
    {
      conversationId,
      senderId: { $ne: userId },  // Don't mark your own messages
      readAt:   null,             // Only unread messages
    },
    { readAt: new Date() }
  );
  return result.modifiedCount;
};

// Count unread messages for a user in a conversation
const countUnread = async (conversationId, userId) => {
  return Message.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    readAt:   null,
  });
};

module.exports = { create, findByConversation, markAsRead, countUnread };