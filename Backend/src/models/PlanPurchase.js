const mongoose = require("mongoose");

// Ledger of plan purchases — the platform's subscription revenue. Paid either
// from the collector's wallet (a matching "subscription" Transaction debits
// it) or recorded by an admin after the collector paid outside the app.
const planPurchaseSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planKey: { type: String, enum: ["pro", "elite"], required: true },
    price: { type: Number, required: true, min: 0 },
    days: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["wallet", "admin"], required: true },
    reference: { type: String, trim: true, maxlength: 80 },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

planPurchaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PlanPurchase", planPurchaseSchema);