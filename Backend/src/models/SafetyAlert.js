const mongoose = require("mongoose");

// An SOS raised by the requester or the collector during a pickup. Only the
// admin team is told (never the other party), and an admin resolves it.
const safetyAlertSchema = new mongoose.Schema(
  {
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", required: true, index: true },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    triggeredRole: { type: String, enum: ["user", "collector"], required: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: ["active", "resolved"], default: "active", index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

safetyAlertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SafetyAlert", safetyAlertSchema);