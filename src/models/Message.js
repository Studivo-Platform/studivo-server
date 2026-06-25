const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Conversation',
      required: true,
      index:    true,
    },

    senderId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    text: {
      type:      String,
      required:  [true, 'Message text is required'],
      maxlength: [2000, 'Message must be at most 2000 characters'],
      trim:      true,
    },

    // Optional image attachments (Cloudinary URLs)
    attachments: {
      type:    [String],
      default: [],
    },

    // null = not yet read, Date = when it was read
    readAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,  // createdAt = message sent time
  }
);

// Index for fetching messages in a conversation ordered by time
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = { Message };