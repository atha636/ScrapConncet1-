const ScrapRate = require("../models/ScrapRate");
const ScrapRateHistory = require("../models/ScrapRateHistory");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { BASE_RATE_PER_KG, setCachedRate } = require("../utils/pricing");

const SCRAP_TYPES = Object.keys(BASE_RATE_PER_KG);

// GET /api/scrap-rates — public, no auth. Anyone missing from the DB falls
// back to the hardcoded default so the page never shows a gap just because
// a type hasn't been saved yet (e.g. right after this feature ships).
exports.getRates = asyncHandler(async (req, res) => {
  const rates = await ScrapRate.find().sort({ scrapType: 1 });
  const byType = new Map(rates.map((r) => [r.scrapType, r]));

  const list = SCRAP_TYPES.map((scrapType) => {
    const doc = byType.get(scrapType);
    return {
      scrapType,
      ratePerKg: doc ? doc.ratePerKg : BASE_RATE_PER_KG[scrapType],
      updatedAt: doc ? doc.updatedAt : null,
    };
  });

  res.json({ rates: list });
});

// PUT /api/scrap-rates/:scrapType — admin only. Upserts a single type's
// rate. Kept per-type (rather than one big bulk-save endpoint) so the
// admin editor can save one row at a time without clobbering concurrent
// edits to other rows.
exports.updateRate = asyncHandler(async (req, res) => {
  const { scrapType } = req.params;
  const { ratePerKg } = req.body;

  if (!SCRAP_TYPES.includes(scrapType)) {
    throw new ApiError(400, "Unknown scrap type");
  }
  if (typeof ratePerKg !== "number" || Number.isNaN(ratePerKg) || ratePerKg < 0) {
    throw new ApiError(400, "ratePerKg must be a non-negative number");
  }

  const previous = await ScrapRate.findOne({ scrapType });
  const previousRate = previous ? previous.ratePerKg : BASE_RATE_PER_KG[scrapType];

  // Nothing changed — don't write a duplicate history point.
  if (previousRate === ratePerKg && previous) {
    return res.json({
      scrapType: previous.scrapType,
      ratePerKg: previous.ratePerKg,
      updatedAt: previous.updatedAt,
    });
  }

  // First ever change for this type: log the rate it had until now as a
  // baseline so the trend line has a starting point.
  const hasHistory = await ScrapRateHistory.exists({ scrapType });
  if (!hasHistory) {
    await ScrapRateHistory.create({
      scrapType,
      ratePerKg: previousRate,
      changedAt: previous ? previous.createdAt : new Date(Date.now() - 1000),
    });
  }

  const rate = await ScrapRate.findOneAndUpdate(
    { scrapType },
    { ratePerKg, updatedBy: req.user.id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Make the new rate live for pricing immediately, not just visible on
  // the public rates page.
  setCachedRate(rate.scrapType, rate.ratePerKg);

  await ScrapRateHistory.create({
    scrapType: rate.scrapType,
    ratePerKg: rate.ratePerKg,
    changedBy: req.user.id,
  });

  res.json({
    scrapType: rate.scrapType,
    ratePerKg: rate.ratePerKg,
    updatedAt: rate.updatedAt,
  });
});

// GET /api/scrap-rates/history?days=90 — public. Returns each type's
// recorded rate changes in the window, oldest first, for the trend chart.
exports.getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Latest point at/before the window start per type is needed so lines
  // don't start mid-air; simplest is to fetch everything for types that
  // changed and let the client carry values forward.
  const rows = await ScrapRateHistory.find({ changedAt: { $gte: since } })
    .sort({ changedAt: 1 })
    .select("scrapType ratePerKg changedAt -_id");

  res.json({ history: rows });
});