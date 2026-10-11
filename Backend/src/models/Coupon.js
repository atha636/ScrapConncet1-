const mongoose = require("mongoose");

// A promo code an admin creates. The user enters it when requesting a pickup;
// once that pickup settles, the bonus is worked out on the FINAL price (so a
// weight change moves it too) and the platform covers it — see
// utils/coupons.js creditCouponBonus.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 140, default: "" },
    type: { type: String, enum: ["percent", "flat"], required: true },
    // percent: 1-100 (% of the final price); flat: rupees
    value: { type: Number, required: true, min: 1 },
    // Cap for percent coupons (₹). null = no cap.
    maxBonus: { type: Number, min: 1, default: null },
    // Bonus only applies if the final price reaches this (₹).
    minOrderValue: { type: Number, min: 0, default: 0 },
    firstPickupOnly: { type: Boolean, default: false },
    // Total uses across everyone (null = unlimited) and per person.
    maxRedemptions: { type: Number, min: 1, default: null },
    perUserLimit: { type: Number, min: 1, default: 1 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);