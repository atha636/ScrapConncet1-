const mongoose = require("mongoose");
const { SCRAP_TYPES } = require("./Pickup");
const { FREQUENCIES } = require("../utils/recurrence");

// A template a requester sets up once — "collect this every 2 weeks" —
// that a cron job (see jobs/spawnRecurringPickups.js) turns into a real
// Pickup document on schedule, rather than the requester having to fill
// out the request form again every time. Kept as its own collection
// rather than a flag on Pickup, since a template has its own independent
// lifecycle (active/paused, its own schedule) that outlives any single
// spawned pickup.
const recurringPickupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    scrapType: { type: String, enum: SCRAP_TYPES, required: true },
    estimatedWeightKg: { type: Number, min: 0 },
    contactName: { type: String, required: true, trim: true, maxlength: 60 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 20 },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      address: { type: String, trim: true, maxlength: 200 },
    },

    frequency: { type: String, enum: FREQUENCIES, required: true },
    active: { type: Boolean, default: true },
    nextRunAt: { type: Date, required: true },
    lastPickupCreatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The cron job's core query is "active templates due to run" — this index
// makes that a direct lookup instead of a collection scan as the number of
// templates grows.
recurringPickupSchema.index({ active: 1, nextRunAt: 1 });
recurringPickupSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("RecurringPickup", recurringPickupSchema);