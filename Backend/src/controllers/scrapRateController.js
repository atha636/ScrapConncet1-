const ScrapRate = require("../models/ScrapRate");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { BASE_RATE_PER_KG } = require("../utils/pricing");

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

  const rate = await ScrapRate.findOneAndUpdate(
    { scrapType },
    { ratePerKg, updatedBy: req.user.id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({
    scrapType: rate.scrapType,
    ratePerKg: rate.ratePerKg,
    updatedAt: rate.updatedAt,
  });
});