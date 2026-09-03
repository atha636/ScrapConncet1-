const mongoose = require("mongoose");

// Filed by either party on a pickup (requester or the assigned collector)
// when something went wrong — a no-show, a weight/price disagreement,
// property damage, and so on. Kept as its own collection rather than a
// field on Pickup, because a dispute has its own lifecycle (open →
// resolved/dismissed, with an admin's resolution notes) that has nothing
// to do with the pickup's own status.
const REASONS = [
  "no_show",
  "wrong_weight_or_price",
  "damaged_property",
  "unsafe_or_rude_behavior",
  "payment_issue",
  "other",
];

const disputeSchema = new mongoose.Schema(
  {
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Denormalized at creation time from the pickup's own user/collector —
    // deliberately not just "whoever isn't reportedBy," since a future
    // pickup could in principle involve more parties, and storing it
    // explicitly means a resolved dispute's record doesn't silently change
    // meaning if a pickup were ever reassigned.
    reportedAgainst: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    reason: { type: String, enum: REASONS, required: true },
    description: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ["open", "resolved", "dismissed"],
      default: "open",
    },

    resolutionNotes: { type: String, trim: true, maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ pickup: 1 });

// One open dispute per (pickup, reporter) pair at a time — a partial unique
// index, so it only blocks a *duplicate open* report; the same person can
// still file a new one later if a prior dispute on the same pickup was
// already resolved/dismissed. Mirrors the exact pattern PayoutRequest uses
// for "one pending request at a time," including why it has to be a DB-level
// constraint rather than just a findOne-then-create check in the controller
// (a race between two rapid submissions could otherwise both pass the check
// before either document exists yet).
disputeSchema.index(
  { pickup: 1, reportedBy: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

module.exports = mongoose.model("Dispute", disputeSchema);
module.exports.REASONS = REASONS;