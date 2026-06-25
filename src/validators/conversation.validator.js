const { z } = require("zod");

const createConversationSchema = require("zod").object({
  requestId: require("zod")
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid request ID"),
  sellerId: require("zod")
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid seller ID"),
  offerId: require("zod")
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
});

module.exports = { createConversationSchema };
