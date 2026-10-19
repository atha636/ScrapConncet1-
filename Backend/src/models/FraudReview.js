const mongoose = require("mongoose");

// An admin's "I've looked at this" on a fraud-watch flag. The flag stays
// hidden until its evidence grows past what was reviewed, so a handled
// account doesn't keep reappearing, but a getting-worse one does.
const fraudReviewSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    evidenceCount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FraudReview", fraudReviewSchema);