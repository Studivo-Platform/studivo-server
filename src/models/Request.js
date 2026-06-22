const mongoose = require("mongoose");

// ParsedData is embedded inside Request — not a separate collection.
// This keeps all request data in one DB read.
const parsedDataSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        "electronics",
        "housing",
        "books",
        "services",
        "transport",
        "food",
        "other",
      ],
      default: "other",
    },
    subCategory: { type: String, default: null }, // e.g. 'laptop', 'apartment'
    specs: { type: Map, of: String, default: {} }, // e.g. { ram: '16GB', cpu: 'i7' }
    budget: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: "EGP" },
    },
    location: { type: String, default: null },
    keywords: { type: [String], default: [] }, // Used for Atlas Search fallback
  },
  { _id: false }, // No separate _id for embedded docs
);

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    rawText: {
      type: String,
      required: [true, "Request text is required"],
      minlength: [10, "Request must be at least 10 characters"],
      maxlength: [500, "Request must be at most 500 characters"],
      trim: true,
    },

    parsedData: {
      type: parsedDataSchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: ["open", "matched", "closed"],
      default: "open",
      index: true,
    },

    // How many times this request page was viewed
    viewCount: {
      type: Number,
      default: 0,
    },

    // Auto-expires after 7 days — MongoDB TTL index handles deletion
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // now + 7 days
      index: { expireAfterSeconds: 0 }, // TTL index: delete when expiresAt is reached
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// Compound index: find open requests by category fast (used by seller dashboard)
requestSchema.index({ "parsedData.category": 1, status: 1 });

// Text index for search (fallback when Atlas Search not available)
requestSchema.index({ rawText: "text", "parsedData.keywords": "text" });

const Request = mongoose.model("Request", requestSchema);

module.exports = { Request };
