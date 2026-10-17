// Fair Price Meter: turns the live platform rate plus what similar pickups
// actually settled at into a "fair range" for one pickup. Pure (no DB) so
// the maths is in one place; the controller supplies the numbers.

// A deal this far either side of the expected price still counts as fair.
const FAIR_HALF_WIDTH = 0.12;

// How many past negotiated deals (same scrap type) we need before we trust
// them over the plain market rate, and how far they're allowed to move it.
const MIN_HISTORY_SAMPLES = 5;
const MIN_RATIO = 0.8;
const MAX_RATIO = 1.15;

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * @param {object} p
 * @param {number} p.marketValue - estimateItemsPrice at today's rates
 * @param {number[]} p.settledRatios - past (settled amount / market value at today's rates) for same-type pickups
 * @returns {{ low:number, mid:number, high:number, basis:"history"|"market", samples:number }}
 */
function buildFairBand({ marketValue, settledRatios = [] }) {
  const usable = settledRatios.filter((r) => Number.isFinite(r) && r > 0);
  const useHistory = usable.length >= MIN_HISTORY_SAMPLES;
  const ratio = useHistory ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, median(usable))) : 1;
  const mid = marketValue * ratio;
  return {
    low: Math.round(mid * (1 - FAIR_HALF_WIDTH)),
    mid: Math.round(mid),
    high: Math.round(mid * (1 + FAIR_HALF_WIDTH)),
    basis: useHistory ? "history" : "market",
    samples: usable.length,
  };
}

module.exports = { buildFairBand, FAIR_HALF_WIDTH, MIN_HISTORY_SAMPLES };