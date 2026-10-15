const { z } = require("zod");

const sosSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  note: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

const resolveSchema = z.object({
  note: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

module.exports = { sosSchema, resolveSchema };