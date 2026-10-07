// Turns "what the user has" into rupees for a given set of per-kg rates.
//
//   materials  : [{ scrapType, weightKg }]       — sold by weight
//   countItems : [{ key, qty }]                  — sold by the piece
//   rates      : per-kg rates being applied (a collector's, or the platform's)
//   platformRates : the standard rates, used as the baseline for countItems
//   catalogMap : Map(key -> catalog entry)
//
// Per-piece items don't have a per-kg price, so a piece is worth its catalog
// value scaled by how this collector's rate for that category compares with
// the platform's. A collector paying 5% more per kg of e-waste than the
// platform quotes 5% more for a phone too.
function priceLines({ materials = [], countItems = [] }, rates, platformRates, catalogMap) {
  const lines = [];

  for (const m of materials) {
    const rate = rates[m.scrapType] ?? rates.other;
    lines.push({
      label: `${m.weightKg} kg ${m.scrapType}`,
      amount: Math.round(rate * m.weightKg),
    });
  }

  for (const ci of countItems) {
    const entry = catalogMap.get(ci.key);
    const platform = platformRates[entry.scrapType];
    const factor = platform > 0 ? (rates[entry.scrapType] ?? platform) / platform : 1;
    lines.push({
      label: `${ci.qty} × ${entry.label}`,
      amount: Math.round(entry.valueEach * ci.qty * factor),
    });
  }

  return { total: lines.reduce((sum, l) => sum + l.amount, 0), lines };
}

// The same load expressed the way a Pickup stores it: weight per scrap
// type. Pieces are converted using their typical weight, and lines of the
// same type are merged so a mixed load stays well inside the per-pickup
// item limit.
function toPickupItems({ materials = [], countItems = [] }, catalogMap) {
  const byType = {};
  for (const m of materials) byType[m.scrapType] = (byType[m.scrapType] || 0) + m.weightKg;
  for (const ci of countItems) {
    const entry = catalogMap.get(ci.key);
    byType[entry.scrapType] = (byType[entry.scrapType] || 0) + entry.weightKgEach * ci.qty;
  }
  return Object.entries(byType).map(([scrapType, kg]) => ({
    scrapType,
    estimatedWeightKg: Math.round(kg * 10) / 10,
  }));
}

module.exports = { priceLines, toPickupItems };