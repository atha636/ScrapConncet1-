const mongoose = require("mongoose");

// Admin overrides for the countable-item catalog (see utils/itemCatalog.js).
// Only the numbers an admin can tune live here — an item's label and which
// scrap category it belongs to come from the defaults in code. An item with
// no document here just uses its default values.
const itemCatalogEntrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    valueEach: { type: Number, required: true, min: 0, max: 100000 },
    weightKgEach: { type: Number, required: true, min: 0.01, max: 2000 },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemCatalogEntry", itemCatalogEntrySchema);