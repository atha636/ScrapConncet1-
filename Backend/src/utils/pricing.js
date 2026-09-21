// Base rate per kg by scrap type (₹). Centralized so it can later be moved
// into a DB-backed admin-configurable table without touching controllers.
const BASE_RATE_PER_KG = {
  metal: 50,
  plastic: 20,
  paper: 10,
  "e-waste": 80,
  glass: 8,
  other: 5,
};

const MIN_PRICE = 5;

/**
 * Estimates a price for a pickup request.
 * @param {string} scrapType
 * @param {number} [estimatedWeightKg] - defaults to 1kg if not provided
 */
function estimatePrice(scrapType, estimatedWeightKg) {
  const rate = BASE_RATE_PER_KG[scrapType] ?? BASE_RATE_PER_KG.other;
  const weight = estimatedWeightKg && estimatedWeightKg > 0 ? estimatedWeightKg : 1;
  return Math.max(MIN_PRICE, Math.round(rate * weight));
}

/**
 * Estimates the total price for a mixed-load pickup — one MIN_PRICE floor
 * per item (not one floor for the whole load), so a pickup with a tiny
 * scrap of glass tossed in alongside a proper load of metal still prices
 * that glass fairly instead of it getting rounded into nothing by the
 * dominant item.
 * @param {Array<{scrapType: string, estimatedWeightKg?: number}>} items
 */
function estimateItemsPrice(items) {
  return items.reduce((total, item) => total + estimatePrice(item.scrapType, item.estimatedWeightKg), 0);
}

module.exports = { estimatePrice, estimateItemsPrice, BASE_RATE_PER_KG };