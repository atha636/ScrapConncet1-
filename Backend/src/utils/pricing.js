// Base rate per kg by scrap type (₹). Kept as the hardcoded fallback —
// rateCache below starts as a copy of this and is overwritten per-type by
// whatever's admin-saved in the ScrapRate collection (see refreshRateCache
// and setCachedRate). estimatePrice/estimateItemsPrice always read the
// cache, not the DB, so they stay synchronous and no call site elsewhere
// (pickupController, spawnRecurringPickups, settlement.js) has to change.
const BASE_RATE_PER_KG = {
  metal: 50,
  plastic: 20,
  paper: 10,
  "e-waste": 80,
  glass: 8,
  other: 5,
};

const MIN_PRICE = 5;

let rateCache = { ...BASE_RATE_PER_KG };

// Call once at server startup (after the DB connects) to seed the cache
// with any admin-saved rates. Falls back to BASE_RATE_PER_KG for types
// that haven't been saved yet.
async function refreshRateCache() {
  const ScrapRate = require("../models/ScrapRate");
  const rates = await ScrapRate.find();
  const next = { ...BASE_RATE_PER_KG };
  for (const r of rates) next[r.scrapType] = r.ratePerKg;
  rateCache = next;
  return rateCache;
}

// Called by scrapRateController right after an admin save, so the new
// rate is live for pricing immediately without an extra DB round trip.
function setCachedRate(scrapType, ratePerKg) {
  rateCache = { ...rateCache, [scrapType]: ratePerKg };
}

/**
 * Estimates a price for a pickup request.
 * @param {string} scrapType
 * @param {number} [estimatedWeightKg] - defaults to 1kg if not provided
 */
function estimatePrice(scrapType, estimatedWeightKg) {
  const rate = rateCache[scrapType] ?? rateCache.other;
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

// Snapshot of the rates currently in effect (admin-saved overrides on top of
// the hardcoded defaults) — used by the quote comparison so every collector's
// quote is measured against the same live platform rates.
function getRates() {
  return { ...rateCache };
}

module.exports = {
  getRates,
  estimatePrice,
  estimateItemsPrice,
  BASE_RATE_PER_KG,
  refreshRateCache,
  setCachedRate,
};