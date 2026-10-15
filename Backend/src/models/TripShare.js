const mongoose = require("mongoose");

// A link a requester or collector can send to someone they trust so that
// person can follow the pickup without an account. Kept off the Pickup
// document on purpose: pickups are broadcast to every connected client, and
// the token must never travel with them.
const tripShareSchema = new mongoose.Schema(
  {
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", required: true, index: true },
    token: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revokedAt: { type: Date, default: null },
    // Last position the collector's phone reported, copied across at most
    // every few seconds by the socket handler.
    lastLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripShare", tripShareSchema);