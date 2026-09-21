const mongoose = require("mongoose");

const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

const pickupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    scrapType: { type: String, enum: SCRAP_TYPES, required: true },
    estimatedWeightKg: { type: Number, min: 0 },

    // The actual line items for this pickup — one pickup, several kinds
    // of scrap (e.g. metal + plastic + an old charger), instead of a
    // requester having to file a separate pickup per type for what is
    // physically one pile in one location. `scrapType`/`estimatedWeightKg`
    // above are kept and kept in sync (see the pre-save hook below)
    // rather than removed, so every existing scrapType-based reader —
    // collector type-preference filters, badge/analytics grouping, CSV
    // export, dispute and notification text, the recurring-pickup
    // spawner — keeps working unmodified: `scrapType` becomes "the first
    // item's type" and `estimatedWeightKg` becomes "the summed weight
    // across items". A caller that never adopts `items` at all (the
    // recurring-pickup job, still: see spawnRecurringPickups.js) still
    // works too — the same hook synthesizes a single-entry `items` array
    // from `scrapType`/`estimatedWeightKg` the other direction, so any
    // items-aware reader never has to special-case an old-style pickup.
    //
    // Not `required: true` at the schema level for the same reason
    // contactName/contactPhone above aren't — enforced at the Zod
    // validator layer only (see createPickupSchema), so a pickup that
    // predates this field doesn't fail validation the next time an
    // unrelated update (e.g. escalateStalePickups) calls .save() on it.
    items: [
      {
        scrapType: { type: String, enum: SCRAP_TYPES, required: true },
        estimatedWeightKg: { type: Number, min: 0 },
      },
    ],

    image: { type: String, default: null },

    // Uploaded by the collector at the moment they mark the pickup
    // "completed" — proof of what was actually collected, so a later
    // dispute ("this was never picked up" / "the weight doesn't match
    // what I was paid for") has real evidence to check against instead of
    // just one party's word against the other's.
    completionPhoto: { type: String, default: null },

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

    // Price negotiation — lets a collector counter the system-estimated
    // price on a still-"pending" pickup instead of only ever accepting it
    // as-is, and lets the requester counter back. Deliberately its own
    // subdocument rather than reusing `price`/`statusHistory`: the
    // pickup's top-level `status` only changes once (pending -> accepted)
    // when a negotiation resolves, but the back-and-forth of offers needs
    // its own independent state machine to get there.
    //
    // Scoped to a single collector at a time (`negotiation.collector`) —
    // a pickup can only be in one active negotiation, so a second
    // collector proposing an offer while one is already in flight is
    // rejected at the controller layer (see pickupController.proposeOffer)
    // rather than silently overwriting the first collector's offer.
    negotiation: {
      status: {
        type: String,
        enum: ["none", "pending", "accepted", "declined"],
        default: "none",
      },
      collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      offers: [
        {
          amount: { type: Number, required: true, min: 0 },
          note: { type: String, trim: true, maxlength: 200, default: "" },
          // Who made this particular offer — not the same as "who the
          // collector/requester on the pickup is", since either side can
          // be the one proposing at any point in the back-and-forth.
          offeredBy: { type: String, enum: ["collector", "requester"], required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },

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

  // Keep items <-> scrapType/estimatedWeightKg in sync — see the comment
  // on `items` above for why both directions matter. `items` wins when
  // both are present and items just changed, since createPickup always
  // sets items going forward and scrapType/estimatedWeightKg are the
  // derived, legacy-compatibility view of it — not the other way around.
  if (this.isModified("items") && this.items && this.items.length > 0) {
    this.scrapType = this.items[0].scrapType;
    const totalWeight = this.items.reduce((sum, it) => sum + (it.estimatedWeightKg || 0), 0);
    this.estimatedWeightKg = totalWeight > 0 ? totalWeight : undefined;
  } else if (this.isNew && (!this.items || this.items.length === 0) && this.scrapType) {
    this.items = [{ scrapType: this.scrapType, estimatedWeightKg: this.estimatedWeightKg }];
  }

  next();
});

pickupSchema.methods.pushHistory = function (status, changedBy) {
  this.statusHistory.push({ status, changedBy });
  this.status = status;
};

module.exports = mongoose.model("Pickup", pickupSchema);
module.exports.SCRAP_TYPES = SCRAP_TYPES;