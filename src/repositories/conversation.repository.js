const { Conversation } = require("../models/Conversation");

// Find existing conversation or create a new one
// Uses findOneAndUpdate with upsert to prevent race conditions
const findOrCreate = async ({ participants, requestId, offerId }) => {
  // Sort participants so [A,B] and [B,A] result in the same conversation
  const sortedParticipants = [...participants].sort();
  const conversationKey = `${requestId}:${sortedParticipants.join(':')}`;

  const conversation = await Conversation.findOneAndUpdate(
  { conversationKey },
  {
    $setOnInsert: {
      conversationKey,
      participants: sortedParticipants,
      requestId,
      offerId: offerId ?? null,
    },
  },
    {
      upsert: true, // Create if not found
      returnDocument: 'after', // Return the document after update
      setDefaultsOnInsert: true,
    },
  ).populate("participants", "name profileImage role");

  return conversation;
};

// Get all conversations for a user (sorted by last message)
const findByUser = async (userId, { page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find({ participants: userId })
      .populate("participants", "name profileImage role")
      .populate("requestId", "rawText parsedData status")
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments({ participants: userId }),
  ]);

  return { conversations, total, page, limit };
};

// Find single conversation — verify user is a participant
const findByIdAndParticipant = async (conversationId, userId) => {
  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
};

// Update last message preview (called after each new message)
const updateLastMessage = async (conversationId, { text, senderId }) => {
  return Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text.slice(0, 50), // Preview only
    lastMessageAt: new Date(),
    lastSenderId: senderId,
  });
};

module.exports = {
  findOrCreate,
  findByUser,
  findByIdAndParticipant,
  updateLastMessage,
};
