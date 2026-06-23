const { ScrapedResult } = require('../models/ScrapedResult');

// Bulk insert scraped results for a request
const bulkCreate = async (results) => {
  if (!results.length) return [];
  return ScrapedResult.insertMany(results, { ordered: false });
};

// Get all scraped results for a request
const findByRequest = async (requestId) => {
  return ScrapedResult
    .find({ requestId })
    .sort({ price: 1 })   // Cheapest first
    .lean();
};

// Delete old results for a request (before re-scraping)
const deleteByRequest = async (requestId) => {
  return ScrapedResult.deleteMany({ requestId });
};

module.exports = { bulkCreate, findByRequest, deleteByRequest };