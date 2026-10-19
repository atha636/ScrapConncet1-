const { z } = require("zod");

const reviewSchema = z.object({
  key: z.string().trim().min(3).max(160),
  evidenceCount: z.number().int().min(0).max(100000),
  note: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

module.exports = { reviewSchema };