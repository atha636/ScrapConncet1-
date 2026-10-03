const mongoose = require("mongoose");

// Append-only log: one row each time an admin changes a scrap type's rate.
// Powers the rate trend chart on the public scrap rates page.
const scrapRateHistorySchema = new mongoose.Schema({
  scrapType: { type: String, required: true, index: true },
  ratePerKg: { type: Number, required: true, min: 0 },
  changedAt: { type: Date, default: Date.now, index: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

module.exports = mongoose.model("ScrapRateHistory", scrapRateHistorySchema);