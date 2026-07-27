const mongoose = require("mongoose");

const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

const pickupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    scrapType: { type: String, enum: SCRAP_TYPES, required: true },
    estimatedWeightKg: { type: Number, min: 0 },
    image: { type: String, default: null },

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