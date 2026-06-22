const { z } = require("zod");

const CATEGORIES = [
  "electronics",
  "housing",
  "books",
  "services",
  "transport",
  "food",
  "other",
];

const createRequestSchema = z.object({
  rawText: z
    .string({ required_error: "Request text is required" })
    .min(10, "Request must be at least 10 characters")
    .max(500, "Request must be at most 500 characters")
    .trim(),

  // Optional: student can hint the category before AI parses
  categoryHint: z
    .enum(CATEGORIES, {
      errorMap: () => ({
        message: `Category must be one of: ${CATEGORIES.join(", ")}`,
      }),
    })
    .optional(),

  // Optional: student can set budget manually
  budget: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
      currency: z.string().default("EGP"),
    })
    .optional(),
});

const closeRequestSchema = z.object({
  // No body needed — just the ID in the URL param
});

// Query params for GET /api/requests (seller view)
const listRequestsSchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  page: z.string().default("1").transform(Number),
  limit: z.string().default("10").transform(Number),
});

module.exports = {
  createRequestSchema,
  closeRequestSchema,
  listRequestsSchema,
};
