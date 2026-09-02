const { z } = require("zod");
const { SCRAP_TYPES } = require("../models/Pickup");

const numberLike = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v));

const createPickupSchema = z.object({
  scrapType: z.enum(SCRAP_TYPES),
  estimatedWeightKg: numberLike.pipe(z.number().min(0)).optional(),
  // Every pickup needs a confirmed, working contact — see the comment on
  // Pickup.contactName/contactPhone for why this isn't just read off the
  // account's own (optional) profile phone instead.
  contactName: z.string().trim().min(2, "Contact name is required").max(60),
  contactPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  lat: numberLike.pipe(z.number().min(-90).max(90)),
  lng: numberLike.pipe(z.number().min(-180).max(180)),
  address: z.string().trim().max(200).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["accepted", "in_progress", "completed", "cancelled"]),
});

module.exports = { createPickupSchema, updateStatusSchema };