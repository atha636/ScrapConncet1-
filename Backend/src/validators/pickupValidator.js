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

const objectIdLike = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid pickup id");

// Capped well above any realistic single batch (a collector reviewing a
// screenful of nearby jobs) — this exists to bound request size, not to
// reflect a real expected count.
const MAX_BATCH_ACCEPT = 20;

const batchAcceptSchema = z.object({
  ids: z.array(objectIdLike).min(1, "Select at least one pickup").max(MAX_BATCH_ACCEPT),
});

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)");

const scheduleEntrySchema = z
  .object({
    day: z.number().int().min(0).max(6),
    start: timeString,
    end: timeString,
  })
  // Refined rather than left to collectorAvailability.js to silently
  // treat as "never available" — an end time that isn't after start is
  // almost certainly a mistake (e.g. swapped fields), so this rejects it
  // at the point of saving instead of producing a schedule that quietly
  // never lets the collector accept anything on that day.
  .refine((entry) => entry.start < entry.end, {
    message: "End time must be after start time",
    path: ["end"],
  });

const updateAvailabilitySchema = z.object({
  paused: z.boolean().optional(),
  scheduleEnabled: z.boolean().optional(),
  // At most one entry per weekday — validated here rather than relying on
  // "last one wins" behavior wherever this array gets read, which would
  // silently discard a duplicate instead of telling the collector they
  // set the same day twice.
  schedule: z
    .array(scheduleEntrySchema)
    .max(7)
    .refine((entries) => new Set(entries.map((e) => e.day)).size === entries.length, {
      message: "Each day can only appear once in the schedule",
    })
    .optional(),
});

// Reasonable ceiling on a counter-offer — high enough to never block a
// legitimate high-value e-waste/metal load, low enough to catch an
// obvious fat-fingered entry (e.g. an extra zero) before it ever reaches
// the other party.
const MAX_OFFER_AMOUNT = 100000;

// POST /api/pickup/:id/offer — a collector opening (or re-opening after a
// decline) a negotiation on a pending pickup.
const proposeOfferSchema = z.object({
  amount: numberLike.pipe(z.number().min(1, "Offer must be at least ₹1").max(MAX_OFFER_AMOUNT)),
  note: z.string().trim().max(200).optional(),
});

// PATCH /api/pickup/:id/offer — either side responding to the other's
// most recent offer. `amount`/`note` are only read (and required) when
// action is "counter" — enforced with .refine below rather than making
// them unconditionally required, since "accept"/"decline" carry no offer
// of their own.
const respondOfferSchema = z
  .object({
    action: z.enum(["accept", "decline", "counter"]),
    amount: numberLike.pipe(z.number().min(1, "Offer must be at least ₹1").max(MAX_OFFER_AMOUNT)).optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.action !== "counter" || typeof data.amount === "number", {
    message: "Amount is required to counter",
    path: ["amount"],
  });

module.exports = {
  createPickupSchema,
  updateStatusSchema,
  batchAcceptSchema,
  MAX_BATCH_ACCEPT,
  updateAvailabilitySchema,
  proposeOfferSchema,
  respondOfferSchema,
  MAX_OFFER_AMOUNT,
};