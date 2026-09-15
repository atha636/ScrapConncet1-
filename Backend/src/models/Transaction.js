const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup" },
    payoutRequest: { type: mongoose.Schema.Types.ObjectId, ref: "PayoutRequest" },
    // "referral_bonus" has no associated `pickup` (see referralActivation.js)
    // — the sparse unique index on {pickup, type} below only enforces
    // uniqueness where both fields are present, so any number of
    // referral_bonus transactions without a pickup coexist safely, the same
    // way "payout" transactions already do.
    type: { type: String, enum: ["earning", "payout", "referral_bonus"], default: "earning" },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

transactionSchema.index({ collector: 1, createdAt: -1 });
transactionSchema.index({ pickup: 1, type: 1 }, { unique: true, sparse: true });


transactionSchema.index({ payoutRequest: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Transaction", transactionSchema);