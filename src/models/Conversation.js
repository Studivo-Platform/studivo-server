const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Exactly 2 participants: [studentId, sellerId]
    participants: {
      type:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (arr) => arr.length === 2,
        message:   'A conversation must have exactly 2 participants',
      },
    },

    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Request',
      required: true,
    },

    // The offer that started this conversation (optional)
    offerId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Offer',
      default: null,
    },

    // Denormalized last message for fast conversation list rendering
    lastMessage:   { type: String,  default: null },
    lastMessageAt: { type: Date,    default: null },
    lastSenderId:  { type: mongoose.Schema.Types.ObjectId, default: null },

    status: {
      type:    String,
      enum:    ['active', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Prevent duplicate conversations between same two users for same request
conversationSchema.index({ participants: 1, requestId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = { Conversation };