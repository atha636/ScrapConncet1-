const User = require("../models/User");
const ItemCatalogEntry = require("../models/ItemCatalogEntry");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getRates } = require("../utils/pricing");
const { loadCatalog, DEFAULT_CATALOG } = require("../utils/itemCatalog");
const { priceLines, toPickupItems } = require("../utils/quotes");
const { haversineKm } = require("../utils/routeOptimizer");
const { isCollectorAvailableNow } = require("../utils/collectorAvailability");
const { logAudit } = require("../utils/audit");

const FRESH_LOCATION_MINUTES = 30; // same freshness window as the nearby-collectors list
const RADIUS_KM = 25;
const MAX_COLLECTORS = 8;
const AVG_SPEED_KMH = 20; // rough city average — ETA is an estimate, not a route

// Arrival estimate in minutes, rounded up to the nearest 5 so it doesn't
// pretend to be more precise than "distance ÷ typical speed" really is.
const etaMinutes = (km) => Math.max(5, Math.ceil(((km / AVG_SPEED_KMH) * 60) / 5) * 5);

// GET /api/quotes/catalog — the countable items a user can pick from
exports.getCatalog = asyncHandler(async (req, res) => {
  const items = await loadCatalog();
  res.json({ items: items.map(({ key, label, scrapType, valueEach, weightKgEach }) => ({ key, label, scrapType, valueEach, weightKgEach })) });
});

// GET /api/quotes/catalog/all  (admin) — includes inactive items, for the editor
exports.getCatalogAdmin = asyncHandler(async (req, res) => {
  res.json({ items: await loadCatalog({ includeInactive: true }) });
});

// PUT /api/quotes/catalog/:key  (admin)
exports.updateCatalogItem = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const base = DEFAULT_CATALOG.find((i) => i.key === key);
  if (!base) throw new ApiError(404, "Unknown catalog item");

  const { valueEach, weightKgEach, isActive } = req.body;
  const entry = await ItemCatalogEntry.findOneAndUpdate(
    { key },
    { valueEach, weightKgEach, isActive, updatedBy: req.user.id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await logAudit(req, {
    action: "catalog.update",
    targetType: "catalog_item",
    targetLabel: base.label,
    details: { valueEach, weightKgEach, isActive },
  });

  res.json({ ...base, valueEach: entry.valueEach, weightKgEach: entry.weightKgEach, isActive: entry.isActive });
});

// GET /api/quotes/rate-card  (collector) — their own rates next to the platform's
exports.getRateCard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("collectorRates");
  const mine = {};
  for (const [type, rate] of Object.entries(user?.toObject().collectorRates || {})) {
    if (typeof rate === "number") mine[type] = rate;
  }
  res.json({ platform: getRates(), mine });
});

// PUT /api/quotes/rate-card  (collector) — replaces their whole rate card.
// A type set to null (or left out) falls back to the platform rate.
exports.saveRateCard = asyncHandler(async (req, res) => {
  const next = {};
  for (const [type, rate] of Object.entries(req.body.rates)) {
    if (typeof rate === "number") next[type] = rate;
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  user.collectorRates = next;
  await user.save();

  res.json({ platform: getRates(), mine: next });
});

// POST /api/quotes/compare  (user)
//
// "What's my scrap worth, and who'll pay what?" — works before any pickup
// exists. Nothing here is saved: the user's location is only used for this
// one lookup, and only an approximate distance is returned for collectors
// (never their coordinates).
exports.compareQuotes = asyncHandler(async (req, res) => {
  const { materials, countItems, lat, lng } = req.body;

  const platformRates = getRates();
  const catalog = await loadCatalog();
  const catalogMap = new Map(catalog.map((c) => [c.key, c]));

  for (const ci of countItems) {
    if (!catalogMap.has(ci.key)) throw new ApiError(400, "One of the items you picked isn't available right now");
  }

  const load = { materials, countItems };
  const estimate = priceLines(load, platformRates, platformRates, catalogMap);
  const pickupItems = toPickupItems(load, catalogMap);
  const typesNeeded = [...new Set(pickupItems.map((i) => i.scrapType))];

  const now = new Date();
  const freshSince = new Date(now.getTime() - FRESH_LOCATION_MINUTES * 60 * 1000);

  const candidates = await User.find({
    role: "collector",
    collectorSuspended: false,
    isActive: true,
    "collectorVerification.status": "approved",
    // An approved ID past its expiry date no longer counts (see
    // utils/collectorVerification.js); a missing date means no expiry.
    $or: [{ "collectorVerification.expiresAt": null }, { "collectorVerification.expiresAt": { $gt: now } }],
    "lastKnownLocation.updatedAt": { $gte: freshSince },
  }).select(
    "name rating ratingCount lastKnownLocation collectorPaused availabilitySchedule collectorPreferences collectorRates"
  );

  const quotes = candidates
    .filter((c) => isCollectorAvailableNow(c))
    .map((c) => {
      const distanceKm = Number(haversineKm({ lat, lng }, c.lastKnownLocation).toFixed(1));
      const declared = c.collectorPreferences?.scrapTypes;
      // A collector who only takes some materials is left out when the load
      // includes something they don't take — a quote they'd never honour
      // is worse than no quote.
      const handlesAll = !declared || declared.length === 0 || typesNeeded.every((t) => declared.includes(t));

      const own = {};
      for (const [type, rate] of Object.entries(c.toObject().collectorRates || {})) {
        if (typeof rate === "number") own[type] = rate;
      }
      const rates = { ...platformRates, ...own };

      return {
        collectorId: c._id,
        name: c.name,
        rating: c.rating,
        ratingCount: c.ratingCount,
        distanceKm,
        etaMin: etaMinutes(distanceKm),
        quote: priceLines(load, rates, platformRates, catalogMap).total,
        usesOwnRates: typesNeeded.some((t) => own[t] !== undefined),
        handlesAll,
      };
    })
    .filter((c) => c.handlesAll && c.distanceKm <= RADIUS_KM)
    .sort((a, b) => b.quote - a.quote || (b.rating || 0) - (a.rating || 0))
    .slice(0, MAX_COLLECTORS)
    .map(({ handlesAll, ...rest }) => rest); // eslint-disable-line no-unused-vars

  // Highlights so the list is scannable at a glance.
  if (quotes.length > 1) {
    const best = Math.max(...quotes.map((q) => q.quote));
    const closest = Math.min(...quotes.map((q) => q.distanceKm));
    const topRated = quotes.filter((q) => q.ratingCount >= 3).sort((a, b) => b.rating - a.rating)[0];
    quotes.forEach((q) => {
      q.tags = [];
      if (q.quote === best) q.tags.push("Best price");
      if (q.distanceKm === closest) q.tags.push("Closest");
      if (topRated && q.collectorId === topRated.collectorId) q.tags.push("Top rated");
    });
  } else {
    quotes.forEach((q) => (q.tags = []));
  }

  res.json({ estimate, pickupItems, collectors: quotes, radiusKm: RADIUS_KM });
});