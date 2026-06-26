const { Router } = require("express");
const notifController = require("../controllers/notification.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = Router();
router.use(verifyJWT);

router.get("/", notifController.getNotifications);
router.patch("/read-all", notifController.markAllRead); // Must be BEFORE /:id
router.patch("/:id/read", notifController.markRead);

module.exports = router;