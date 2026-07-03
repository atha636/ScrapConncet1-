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

module.exports = { estimatePrice, BASE_RATE_PER_KG };
