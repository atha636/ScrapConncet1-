const mongoose = require("mongoose");

// One document per scrap type — the admin-editable source of truth for
// per-kg rates. Seeded from the old hardcoded BASE_RATE_PER_KG map in
// utils/pricing.js (kept there as the fallback if a type is ever missing
// here), and read by both the public rate list and the pricing estimator.
const scrapRateSchema = new mongoose.Schema(
  {
    scrapType: {
      type: String,
      required: true,
      unique: true,
      enum: ["metal", "plastic", "paper", "e-waste", "glass", "other"],
    },
    ratePerKg: { type: Number, required: true, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScrapRate", scrapRateSchema);