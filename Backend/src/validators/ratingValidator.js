const { z } = require("zod");

const submitRatingSchema = z.object({
  score: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().min(1).max(5)),
  comment: z.string().trim().max(500).optional(),
});

module.exports = { submitRatingSchema };