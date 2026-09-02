const mongoose = require("mongoose");

const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

const pickupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    scrapType: { type: String, enum: SCRAP_TYPES, required: true },
    estimatedWeightKg: { type: Number, min: 0 },
    image: { type: String, default: null },

    // Captured on the request form itself (pre-filled from the requester's
    // profile, but editable there) rather than only ever reading
    // user.name/user.phone off the account — the account's phone is
    // optional at registration (see authValidator.registerSchema), so
    // relying on it alone meant a collector could accept a pickup with no
    // way to actually call the requester if that field was ever left
    // blank. Requiring a confirmed number at request time closes that gap
    // for every pickup going forward.
    //
    // Deliberately NOT `required: true` here, even though the create
    // endpoint's Zod validator always requires both — escalateStalePickups
    // (see src/jobs) calls pickup.save() on old pending pickups on a cron
    // schedule, and a schema-level `required` would throw a validation
    // error on every pickup created before this field existed the next
    // time that job tries to save one. Enforcing "required" only at the
    // validator layer keeps every new pickup guaranteed to have both,
    // without retroactively invalidating anything already in the database.
    contactName: { type: String, trim: true, maxlength: 60 },
    contactPhone: { type: String, trim: true, maxlength: 20 },

    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      address: { type: String, trim: true },
    },

    // Kept in sync with location.lat/lng via the pre-save hook below.
    // GeoJSON (not plain lat/lng numbers) is what MongoDB's 2dsphere index
    // and $geoNear/$near operators require — this is what makes "pickups
    // near me, sorted by actual distance" a real indexed query instead of
    // fetching every row and computing Haversine distance in JS.
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },

    price: { type: Number, required: true, min: 0 },

    // Set by the escalateStalePickups cron job (see src/jobs) when a pickup
    // has sat pending too long — surfaces it higher in the collector feed
    // instead of it silently going stale with nobody accepting it.
    isUrgent: { type: Boolean, default: false },
    urgentAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

pickupSchema.index({ status: 1, createdAt: -1 });
pickupSchema.index({ user: 1, createdAt: -1 });
pickupSchema.index({ collector: 1, createdAt: -1 });
pickupSchema.index({ geo: "2dsphere" });

pickupSchema.pre("save", function (next) {
  if (this.isModified("location.lat") || this.isModified("location.lng") || this.isNew) {
    if (typeof this.location?.lat === "number" && typeof this.location?.lng === "number") {
      this.geo = { type: "Point", coordinates: [this.location.lng, this.location.lat] };
    }
  }
  next();
});

pickupSchema.methods.pushHistory = function (status, changedBy) {
  this.statusHistory.push({ status, changedBy });
  this.status = status;
};

module.exports = mongoose.model("Pickup", pickupSchema);
module.exports.SCRAP_TYPES = SCRAP_TYPES;