const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: [true, "Request ID is required"],
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller ID is required"],
      index: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [1000, "Description must be at most 1000 characters"],
      trim: true,
    },

    // Cloudinary URLs — uploaded via upload.middleware.js
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "Maximum 5 images allowed per offer",
      },
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },

    // Optional: seller can add delivery/availability info
    deliveryNote: {
      type: String,
      default: null,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: find all offers for a request fast
offerSchema.index({ requestId: 1, createdAt: -1 });

// Compound index: find all offers by a seller fast
offerSchema.index({ sellerId: 1, createdAt: -1 });

const Offer = mongoose.model("Offer", offerSchema);

module.exports = { Offer };
