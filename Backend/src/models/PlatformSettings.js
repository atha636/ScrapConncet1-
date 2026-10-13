const mongoose = require("mongoose");

// One document (key "main") holding the money rules an admin can change:
// whether commission is charged at all, and each collector plan's price and
// commission rate. Defaults live in utils/plans.js; this only stores edits.
const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    // Off until an admin turns it on, so deploying this never changes what
    // collectors earn by surprise.
    commissionEnabled: { type: Boolean, default: false },
    plans: [
      {
        key: { type: String, enum: ["free", "pro", "elite"], required: true },
        name: { type: String, trim: true, maxlength: 30 },
        priceMonthly: { type: Number, min: 0, default: 0 },
        commissionPct: { type: Number, min: 0, max: 30, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);