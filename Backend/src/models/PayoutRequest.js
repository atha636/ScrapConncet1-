const mongoose = require("mongoose");

// A payout request is its own record, separate from the Transaction ledger,
// because "a collector asked to withdraw ₹500" and "₹500 actually left the
// ledger" are different events with different lifecycles — a request can be
// rejected and never touch the ledger at all. Only an *approved* request
// produces a real Transaction (see adminController.approvePayout).
const payoutRequestSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    processedAt: { type: Date, default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminNote: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ collector: 1, createdAt: -1 });
payoutRequestSchema.index({ status: 1, createdAt: -1 });

// Enforces "one pending request at a time" atomically at the DB level —
// the controller's findOne-then-create check alone has a race window where
// two rapid submissions (e.g. a double-tapped button) could both pass the
// check before either creates its document. A partial unique index only
// applies to documents matching the filter, so a collector can freely have
// many approved/rejected requests in their history — just never two
// pending ones at once.
payoutRequestSchema.index(
  { collector: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("PayoutRequest", payoutRequestSchema);