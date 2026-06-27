const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { paginate, paginatedResponse } = require("../utils/paginate");
const userRepo = require("../repositories/user.repository");
const requestRepo = require("../repositories/request.repository");
const offerRepo = require("../repositories/offer.repository");
const { User } = require("../models/User");
const { Request } = require("../models/Request");
const { Offer } = require("../models/Offer");
const { Notification } = require("../models/Notification");

// USER MANAGEMENT

// GET /api/admin/users?role=&isActive=&search=&page=&limit=
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { role, search } = req.query;
  const isActive =
    req.query.isActive === "true"
      ? true
      : req.query.isActive === "false"
        ? false
        : undefined;

  const { users, total } = await userRepo.findAll({
    role,
    isActive,
    search,
    skip,
    limit,
  });

  return res.json(
    new ApiResponse(200, paginatedResponse(users, total, page, limit)),
  );
});

// GET /api/admin/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await userRepo.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  return res.json(new ApiResponse(200, user));
});

// PATCH /api/admin/users/:id/deactivate
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await userRepo.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  const updated = await userRepo.setActive(req.params.id, false);
  return res.json(
    new ApiResponse(200, updated, "User deactivated successfully"),
  );
});

// PATCH /api/admin/users/:id/reactivate
const reactivateUser = asyncHandler(async (req, res) => {
  const user = await userRepo.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  const updated = await userRepo.setActive(req.params.id, true);
  return res.json(
    new ApiResponse(200, updated, "User reactivated successfully"),
  );
});

// REQUEST MANAGEMENT

// GET /api/admin/requests?status=&category=&page=&limit=
const getRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status, category } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter["parsedData.category"] = category;

  const [requests, total] = await Promise.all([
    Request.find(filter)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Request.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, paginatedResponse(requests, total, page, limit)),
  );
});

// DELETE /api/admin/requests/:id
const deleteRequest = asyncHandler(async (req, res) => {
  const request = await Request.findByIdAndDelete(req.params.id);
  if (!request) throw new ApiError(404, "Request not found");

  // Cascade: delete related offers and scraped results
  await Promise.all([Offer.deleteMany({ requestId: req.params.id })]);

  return res.json(
    new ApiResponse(200, null, "Request and related offers deleted"),
  );
});

// OFFER MANAGEMENT

// GET /api/admin/offers?status=&page=&limit=
const getOffers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const [offers, total] = await Promise.all([
    Offer.find(filter)
      .populate("sellerId", "name email")
      .populate("requestId", "rawText status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Offer.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, paginatedResponse(offers, total, page, limit)),
  );
});

// DELETE /api/admin/offers/:id
const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) throw new ApiError(404, "Offer not found");
  return res.json(new ApiResponse(200, null, "Offer deleted"));
});

// DASHBOARD STATS

// GET /api/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Run all counts in parallel for performance
  const [
    totalUsers,
    totalStudents,
    totalSellers,
    totalRequests,
    openRequests,
    totalOffers,
    usersToday,
    requestsToday,
    offersToday,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "seller" }),
    Request.countDocuments(),
    Request.countDocuments({ status: "open" }),
    Offer.countDocuments(),
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    Request.countDocuments({ createdAt: { $gte: todayStart } }),
    Offer.countDocuments({ createdAt: { $gte: todayStart } }),
  ]);

  return res.json(
    new ApiResponse(200, {
      totals: {
        users: totalUsers,
        students: totalStudents,
        sellers: totalSellers,
        requests: totalRequests,
        openRequests,
        offers: totalOffers,
      },
      today: {
        users: usersToday,
        requests: requestsToday,
        offers: offersToday,
      },
    }),
  );
});

module.exports = {
  getUsers,
  getUserById,
  deactivateUser,
  reactivateUser,
  getRequests,
  deleteRequest,
  getOffers,
  deleteOffer,
  getDashboardStats,
};
