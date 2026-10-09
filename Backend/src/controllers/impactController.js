const mongoose = require("mongoose");
const Pickup = require("../models/Pickup");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { computeImpact, weightByTypePipeline, weightByPartnerPipeline } = require("../utils/impact");

const toByType = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.kg]));

// GET /api/impact/me  (any logged-in role) — a user's own recycling impact,
// or for a collector, what they've collected.
exports.getMyImpact = asyncHandler(async (req, res) => {
  const field = req.user.role === "collector" ? "collector" : "user";
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const [rows, partnerRows, pickupCount] = await Promise.all([
    Pickup.aggregate(weightByTypePipeline({ [field]: userId })),
    Pickup.aggregate(weightByPartnerPipeline({ [field]: userId })),
    Pickup.countDocuments({
      [field]: userId,
      status: "completed",
      "settlement.status": { $ne: "disputed" },
    }),
  ]);

  const destinations = partnerRows.map((r) => ({
    name: r._id.name,
    city: r._id.city,
    kg: Math.round(r.kg * 10) / 10,
  }));

  res.json({ ...computeImpact(toByType(rows)), pickupCount, role: req.user.role, destinations });
});

// GET /api/impact/community  (public) — whole-platform totals for the Home
// page. Cached briefly in memory: it's an aggregation over every completed
// pickup and Home is the most-hit public page.
const COMMUNITY_TTL_MS = 5 * 60 * 1000;
let communityCache = { at: 0, data: null };

exports.getCommunityImpact = asyncHandler(async (req, res) => {
  if (communityCache.data && Date.now() - communityCache.at < COMMUNITY_TTL_MS) {
    return res.json(communityCache.data);
  }

  const [rows, pickupCount, collectorCount] = await Promise.all([
    Pickup.aggregate(weightByTypePipeline({})),
    Pickup.countDocuments({ status: "completed", "settlement.status": { $ne: "disputed" } }),
    User.countDocuments({ role: "collector", isActive: true, "collectorVerification.status": "approved" }),
  ]);

  const { totalKg, co2Kg, treesEquivalent } = computeImpact(toByType(rows));
  const data = { totalKg, co2Kg, treesEquivalent, pickupCount, collectorCount };

  communityCache = { at: Date.now(), data };
  res.json(data);
});