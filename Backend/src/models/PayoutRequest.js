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
    // A copy of the collector's User.payoutDetails at the exact moment
    // this request was created — not a live reference to it. Two reasons
    // this has to be a snapshot rather than something admin looks up on
    // User at review time: (1) if the collector edits their UPI ID or
    // bank details after asking for a payout but before admin gets to it,
    // the reviewer needs to see what was on file *when the collector
    // asked*, not a value that changed out from under an in-flight
    // request; (2) it makes every past request self-contained and
    // auditable on its own — "where did this ₹500 actually get sent"
    // never depends on the collector's current (possibly since-changed,
    // possibly since-cleared) payout details still existing.
    payoutSnapshot: {
      method: { type: String, enum: ["upi", "bank"], required: true },
      upiId: { type: String, trim: true },
      bankAccountNumber: { type: String, trim: true },
      bankIfsc: { type: String, trim: true },
      bankAccountHolder: { type: String, trim: true },
    },
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