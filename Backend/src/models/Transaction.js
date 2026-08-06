const mongoose = require("mongoose");

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
transactionSchema.index({ pickup: 1, type: 1 }, { unique: true, sparse: true });


transactionSchema.index({ payoutRequest: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Transaction", transactionSchema);