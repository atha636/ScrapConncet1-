const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One rating per direction per pickup — a requester can't rate the same
// collector twice for the same job, and vice versa.
ratingSchema.index({ pickup: 1, fromUser: 1 }, { unique: true });

// Powers recomputing a user's running average from source (see
// ratingController.submitRating) — every rating for a given toUser.
ratingSchema.index({ toUser: 1 });

module.exports = mongoose.model("Rating", ratingSchema);