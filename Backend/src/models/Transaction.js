const mongoose = require("mongoose");

// Append-only ledger — a collector's balance is always SUM(transactions),
// never a mutable field on User that could drift from reality. This is the
// standard pattern for anything involving money: the ledger is the source
// of truth, a "balance" is just a query over it.
//
// Two entry types:
// - "earning": credited when a pickup completes. Tied to that pickup.
// - "payout":  debited when an admin approves a payout request. Tied to
//   that PayoutRequest, not a pickup — a withdrawal isn't about any single
//   job. `amount` is always stored positive; the sign is implied by `type`
//   wherever a balance is computed (see walletController), so summing
//   raw `amount` is never meaningful on its own — always group by type first.
const transactionSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup" },
    payoutRequest: { type: mongoose.Schema.Types.ObjectId, ref: "PayoutRequest" },
    type: { type: String, enum: ["earning", "payout"], default: "earning" },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

transactionSchema.index({ collector: 1, createdAt: -1 });

// One earning per (pickup, type) — a pickup can never be double-credited
// even if updateStatus were somehow called twice for the same completion.
// sparse: true means this only applies to documents that actually have a
// pickup — payout entries (pickup: null) are never compared against each
// other by this index, avoiding a null/null collision.
transactionSchema.index({ pickup: 1, type: 1 }, { unique: true, sparse: true });

// One ledger entry per payout request — the idempotency guard that makes
// approvePayout safe to retry without ever double-debiting the same request.
transactionSchema.index({ payoutRequest: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Transaction", transactionSchema);