const { Offer } = require('../models/Offer');

// Create offer — called after validating the 3-offer limit 
const create = async (data) => {
  return Offer.create(data);
};

// Count how many offers this seller has on this request
// Used to enforce the max 3 offers rule
const countBySellerAndRequest = async (sellerId, requestId) => {
  return Offer.countDocuments({ sellerId, requestId });
};

// Get all non-withdrawn offers for a request (what the student sees)
const findByRequest = async (requestId) => {
  return Offer
    .find({ requestId, status: { $ne: 'withdrawn' } })
    .populate('sellerId', 'name profileImage university phone')
    .sort({ createdAt: -1 })
    .lean();
};

// Get all offers by a seller (seller dashboard)
const findBySeller = async (sellerId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const [offers, total] = await Promise.all([
    Offer
      .find({ sellerId })
      .populate('requestId', 'rawText status parsedData')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Offer.countDocuments({ sellerId }),
  ]);
  return { offers, total, page, limit };
};

// Find offer by ID and verify ownership
const findByIdAndSeller = async (offerId, sellerId) => {
  return Offer.findOne({ _id: offerId, sellerId });
};

// Update offer fields
const update = async (offerId, data) => {
  return Offer.findByIdAndUpdate(offerId, data, { new: true });
};

// Soft delete — set status to 'withdrawn' instead of deleting
const withdraw = async (offerId) => {
  return Offer.findByIdAndUpdate(
    offerId,
    { status: 'withdrawn' },
    { new: true }
  );
};

module.exports = {
  create,
  countBySellerAndRequest,
  findByRequest,
  findBySeller,
  findByIdAndSeller,
  update,
  withdraw,
};