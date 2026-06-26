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

// Query params validator — validate req.query not req.body
const searchQuerySchema = z.object({
  q: z
    .string({ required_error: "Search query is required" })
    .min(2, "Search query must be at least 2 characters")
    .max(200, "Search query too long")
    .trim(),

  category: z.enum(CATEGORIES).optional(),

  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),

  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),

  page: z.string().default("1").transform(Number),
  limit: z.string().default("20").transform(Number),
});

module.exports = { searchQuerySchema };
