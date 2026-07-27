const mongoose = require("mongoose");

// Append-only ledger — a collector's balance is always SUM(transactions),
// never a mutable field on User that could drift from reality. This is the
// standard pattern for anything involving money: the ledger is the source
// of truth, a "balance" is just a query over it.
//
// One transaction per (pickup, type) is enforced by the unique index below,
// so a pickup can never be double-credited even if updateStatus were somehow
// called twice for the same completion (e.g. a retried request).
const transactionSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", required: true },
    type: { type: String, enum: ["earning"], default: "earning" },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

transactionSchema.index({ collector: 1, createdAt: -1 });
transactionSchema.index({ pickup: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Transaction", transactionSchema);