const ItemCatalogEntry = require("../models/ItemCatalogEntry");

// Things people have around the house that are sold by the piece, not the
// kilo. `valueEach` is a rough platform-wide payout per piece (₹) and
// `weightKgEach` a typical weight — both are STARTING POINTS that an admin
// can edit from the admin panel's "Item catalog" tab. `scrapType` is the
// category the piece falls under, which decides which collector rate it
// scales with (see utils/quotes.js).
const DEFAULT_CATALOG = [
  { key: "mobile_phone", label: "Old mobile phone", scrapType: "e-waste", valueEach: 150, weightKgEach: 0.2 },
  { key: "laptop", label: "Laptop", scrapType: "e-waste", valueEach: 800, weightKgEach: 2.2 },
  { key: "television", label: "Television", scrapType: "e-waste", valueEach: 400, weightKgEach: 10 },
  { key: "washing_machine", label: "Washing machine", scrapType: "metal", valueEach: 700, weightKgEach: 60 },
  { key: "refrigerator", label: "Refrigerator", scrapType: "metal", valueEach: 1200, weightKgEach: 55 },
  { key: "air_conditioner", label: "Air conditioner", scrapType: "metal", valueEach: 1500, weightKgEach: 40 },
  { key: "ceiling_fan", label: "Ceiling fan", scrapType: "metal", valueEach: 80, weightKgEach: 3 },
  { key: "bicycle", label: "Bicycle", scrapType: "metal", valueEach: 250, weightKgEach: 14 },
  { key: "battery", label: "Vehicle / inverter battery", scrapType: "e-waste", valueEach: 600, weightKgEach: 15 },
];

// Defaults with any admin edits applied on top. Inactive items are hidden
// from users unless includeInactive is set (the admin editor needs them).
async function loadCatalog({ includeInactive = false } = {}) {
  const overrides = await ItemCatalogEntry.find();
  const byKey = new Map(overrides.map((o) => [o.key, o]));

  return DEFAULT_CATALOG.map((item) => {
    const o = byKey.get(item.key);
    return {
      ...item,
      valueEach: o ? o.valueEach : item.valueEach,
      weightKgEach: o ? o.weightKgEach : item.weightKgEach,
      isActive: o ? o.isActive : true,
    };
  }).filter((item) => includeInactive || item.isActive);
}

module.exports = { DEFAULT_CATALOG, loadCatalog };