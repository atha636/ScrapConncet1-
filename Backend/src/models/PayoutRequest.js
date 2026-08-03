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

module.exports = mongoose.model("PayoutRequest", payoutRequestSchema);