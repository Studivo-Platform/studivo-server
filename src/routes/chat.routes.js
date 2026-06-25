const { Router } = require("express");
const { createConversationSchema } = require("../validators/conversation.validator");
const chatController = require("../controllers/chat.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");

const router = Router();
router.use(verifyJWT);

router.post(
  "/",
  validate(createConversationSchema),
  chatController.createConversation,
);
router.get("/my", chatController.getMyConversations);
router.get("/:id/messages", chatController.getMessages);

module.exports = router;
