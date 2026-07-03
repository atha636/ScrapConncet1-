const { z } = require("zod");
const { SCRAP_TYPES } = require("../models/Pickup");

const numberLike = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v));

const createPickupSchema = z.object({
  scrapType: z.enum(SCRAP_TYPES),
  estimatedWeightKg: numberLike.pipe(z.number().min(0)).optional(),
  lat: numberLike.pipe(z.number().min(-90).max(90)),
  lng: numberLike.pipe(z.number().min(-180).max(180)),
  address: z.string().trim().max(200).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["accepted", "in_progress", "completed", "cancelled"]),
});

module.exports = { createPickupSchema, updateStatusSchema };
