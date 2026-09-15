const mongoose = require("mongoose");

// One document per referred signup — created at registration (see
// authController.register) and updated exactly once, when the referee
// completes their first-ever pickup (see utils/referralActivation.js).
// Deliberately not just a `referredBy` pointer on the User document alone:
// this is also the ledger of reward state (amount, when, whether it ever
// applied), which a single denormalized field can't hold on its own.
const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // unique — a person can only ever have been referred once, by whoever
    // got there first; this also doubles as the natural lookup key for
    // "does this new user already have a pending referral to activate."
    referee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    // 0 when the referrer has no wallet to credit into (a "user"-role
    // referrer — see referralActivation.js) rather than left null, so a
    // sum() over a referrer's referrals is always a safe, meaningful
    // number without every caller having to null-check first.
    rewardAmount: { type: Number, default: 0 },
    rewardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

referralSchema.index({ referrer: 1, createdAt: -1 });

module.exports = mongoose.model("Referral", referralSchema);