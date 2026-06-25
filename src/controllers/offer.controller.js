const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const offerRepo = require("../repositories/offer.repository");
const requestRepo = require("../repositories/request.repository");
const cloudinaryService = require("../services/cloudinary.service");
const { getIO } = require("../socket/index");
const { emitNewOffer } = require("../socket/events/request.events");

const MAX_OFFERS_PER_SELLER = 3;

// POST /api/offers
// Seller submits an offer on a student request
const createOffer = asyncHandler(async (req, res) => {
  const { requestId, price, description, deliveryNote } = req.body;
  const sellerId = req.user._id;

  // 1. Verify the request exists and is still open
  const request = await requestRepo.findById(requestId);
  if (!request)
    throw new ApiError(404, "Request not found");
  if (request.status !== "open")
    throw new ApiError(400, "This request is no longer accepting offers");

  // 2. Prevent seller from offering on their own request (if they somehow have both roles)
  if (request.userId.toString() === sellerId.toString()) {
    throw new ApiError(400, "You cannot submit an offer on your own request");
  }

  // 3. Enforce max 3 offers per seller per request
  const existingCount = await offerRepo.countBySellerAndRequest(
    sellerId,
    requestId,
  );
  if (existingCount >= MAX_OFFERS_PER_SELLER) {
    throw new ApiError(
      400,
      `You can only submit ${MAX_OFFERS_PER_SELLER} offers per request`,
    );
  }

  const uploadedImages = await cloudinaryService.uploadImages(req.files ?? [], {
    folder: "studivo/offers",
  });

  const images = uploadedImages.map((img) => ({
    url: img.url,
    publicId: img.publicId,
  }));

  // 5. Create the offer
  const offer = await offerRepo.create({
    requestId,
    sellerId,
    price,
    description,
    deliveryNote,
    images,
  });

  // 6. Notify the student via Socket.IO
  try {
    const io = getIO();
    emitNewOffer(io, {
      requestId,
      offerId: offer._id,
      price,
      sellerName: req.user.name,
      studentUserId: request.userId.toString(),
    });
  } catch {
    // Skip if socket not initialized
  }

  return res
    .status(201)
    .json(new ApiResponse(201, offer, "Offer submitted successfully"));
});

// GET /api/offers/request/:requestId
// Get all offers for a request (student sees this)
const getOffersByRequest = asyncHandler(async (req, res) => {
  const offers = await offerRepo.findByRequest(req.params.requestId);
  return res.json(new ApiResponse(200, offers));
});

// GET /api/offers/my
// Seller sees their own offers
const getMyOffers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await offerRepo.findBySeller(req.user._id, { page, limit });
  return res.json(new ApiResponse(200, result));
});

// PATCH /api/offers/:id
// Seller updates their own offer
const updateOffer = asyncHandler(async (req, res) => {
  const offer = await offerRepo.findByIdAndSeller(req.params.id, req.user._id);
  if (!offer)
    throw new ApiError(404, "Offer not found or you are not the owner");

  if (offer.status !== "pending") {
    throw new ApiError(400, "Only pending offers can be updated");
  }

  const updated = await offerRepo.update(req.params.id, req.body);
  return res.json(new ApiResponse(200, updated, "Offer updated successfully"));
});

// DELETE /api/offers/:id
// Seller withdraws their offer (soft delete)
const withdrawOffer = asyncHandler(async (req, res) => {
  const offer = await offerRepo.findByIdAndSeller(req.params.id, req.user._id);
  if (!offer)
    throw new ApiError(404, "Offer not found or you are not the owner");

  if (offer.status === "withdrawn") {
    throw new ApiError(400, "Offer is already withdrawn");
  }

  await offerRepo.withdraw(req.params.id);
  return res.json(new ApiResponse(200, null, "Offer withdrawn successfully"));
});

module.exports = {
  createOffer,
  getOffersByRequest,
  getMyOffers,
  updateOffer,
  withdrawOffer,
};
