const mongoose = require("mongoose");

const pickupSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  scrapType: String,
  image: String,
  location: {
    lat: Number,
    lng: Number
  },
  price: Number,
  status: {
    type: String,
    enum: ["pending", "accepted", "completed"],
    default: "pending"
  },
  collector: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Pickup", pickupSchema);