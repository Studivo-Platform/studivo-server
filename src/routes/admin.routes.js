const { Router } = require("express");
const adminController = require("../controllers/admin.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

// All admin routes require valid JWT + admin role
router.use(verifyJWT);
router.use(requireRole("admin"));

// Users
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/deactivate", adminController.deactivateUser);
router.patch("/users/:id/reactivate", adminController.reactivateUser);

// Requests
router.get("/requests", adminController.getRequests);
router.delete("/requests/:id", adminController.deleteRequest);

// Offers
router.get("/offers", adminController.getOffers);
router.delete("/offers/:id", adminController.deleteOffer);

// Stats
router.get("/stats", adminController.getDashboardStats);

module.exports = router;
