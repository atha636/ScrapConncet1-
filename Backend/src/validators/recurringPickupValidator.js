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

// A pause can't be open-ended through this route (that's what the existing
// toggle is for) and can't run forever: past a year, a "pause" is really a
// cancellation, and a far-future date is far more likely a typo than intent.
const MAX_PAUSE_DAYS = 365;

const pauseRecurringSchema = z.object({
  // null resumes early; an ISO date pauses until then.
  until: z
    .string()
    .datetime({ message: "Enter a valid date" })
    .transform((v) => new Date(v))
    .refine((d) => d.getTime() > Date.now(), "Pick a date in the future")
    .refine((d) => d.getTime() <= Date.now() + MAX_PAUSE_DAYS * 86400000, "Pause for up to a year at most")
    .nullable(),
});

const updateRecurringSchema = z
  .object({
    frequency: z.enum(FREQUENCIES).optional(),
    estimatedWeightKg: numberLike.pipe(z.number().min(0)).optional(),
    contactName: z.string().trim().min(2, "Contact name is required").max(60).optional(),
    contactPhone: z.string().trim().min(7, "Enter a valid phone number").max(20).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

module.exports = { createRecurringSchema, pauseRecurringSchema, updateRecurringSchema, MAX_PAUSE_DAYS };