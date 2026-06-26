const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["new_offer", "new_message", "new_request", "system"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      maxlength: 200,
    },

    // Polymorphic reference — could be requestId, offerId, conversationId
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    resourceType: {
      type: String,
      enum: ["Request", "Offer", "Conversation", null],
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// Get unread notifications fast
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };
