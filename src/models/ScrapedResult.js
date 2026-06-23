const mongoose = require('mongoose');

const scrapedResultSchema = new mongoose.Schema(
  {
    requestId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Request',
      required: true,
      index:    true,
    },

    source: {
      type:     String,
      enum:     ['amazon', 'noon', 'olx', 'aqar', 'btech'],
      required: true,
    },

    title:    { type: String, required: true, trim: true },
    price:    { type: Number, default: null },

    // Original product URL on the external site
    originalUrl:  { type: String, required: true },

    // Affiliate URL with our tracking tag (earns commission on purchase)
    affiliateUrl: { type: String, default: null },

    imageUrl: { type: String, default: null },

    // Extra data specific to the source (rating, specs snippet, etc.)
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // TTL: auto-delete after 2 hours — results become stale
    cachedAt: {
      type:    Date,
      default: Date.now,
      index:   { expireAfterSeconds: 7200 },  // 2 hours
    },
  },
  {
    timestamps: false,  // cachedAt is enough
  }
);

const ScrapedResult = mongoose.model('ScrapedResult', scrapedResultSchema);

module.exports = { ScrapedResult };