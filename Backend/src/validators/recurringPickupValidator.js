const { z } = require("zod");
const { SCRAP_TYPES } = require("../models/Pickup");
const { FREQUENCIES } = require("../utils/recurrence");

const numberLike = z.union([z.number(), z.string()]).transform((v) => Number(v));

const createRecurringSchema = z.object({
  scrapType: z.enum(SCRAP_TYPES),
  estimatedWeightKg: numberLike.pipe(z.number().min(0)).optional(),
  contactName: z.string().trim().min(2, "Contact name is required").max(60),
  contactPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  lat: numberLike.pipe(z.number().min(-90).max(90)),
  lng: numberLike.pipe(z.number().min(-180).max(180)),
  address: z.string().trim().max(200).optional(),
  frequency: z.enum(FREQUENCIES),
});

module.exports = { createRecurringSchema };