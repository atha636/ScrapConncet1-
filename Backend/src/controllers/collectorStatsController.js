const Pickup = require("../models/Pickup");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { computeStreak } = require("../utils/streak");

const WINDOW_DAYS = 7;
const TOP_N = 10;
// Caps how many of a collector's own completed pickups get pulled to
// compute their streak — no realistic streak spans more than a year of
// daily completions, so this is a safe, generous ceiling that keeps the
// query bounded rather than scanning a collector's entire multi-year
// history every time they open this page.
const STREAK_LOOKBACK_LIMIT = 400;

// GET /api/pickup/collector/leaderboard  (collector only)
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);

  // Ranked across every collector with at least one completion in the
  // window — not limited to TOP_N at the query level, since the current
  // collector's own rank (even if they're #47) is computed from this same
  // list by finding their position in it, not a separate query.
  const ranked = await Pickup.aggregate([
    { $match: { status: "completed", collector: { $ne: null }, updatedAt: { $gte: since } } },
    { $group: { _id: "$collector", completedCount: { $sum: 1 } } },
    { $sort: { completedCount: -1 } },
  ]);

  const topEntries = ranked.slice(0, TOP_N);
  const users = await User.find({ _id: { $in: topEntries.map((r) => r._id) } }).select("name");
  const nameById = new Map(users.map((u) => [String(u._id), u.name]));

  const top = topEntries.map((r, i) => ({
    rank: i + 1,
    collectorId: r._id,
    name: nameById.get(String(r._id)) || "Collector",
    completedCount: r.completedCount,
  }));

  const myIndex = ranked.findIndex((r) => String(r._id) === String(req.user.id));

  const myCompletions = await Pickup.find({ collector: req.user.id, status: "completed" })
    .select("updatedAt")
    .sort({ updatedAt: -1 })
    .limit(STREAK_LOOKBACK_LIMIT);

  res.json({
    windowLabel: `Last ${WINDOW_DAYS} days`,
    top,
    me: {
      rank: myIndex >= 0 ? myIndex + 1 : null,
      completedCount: myIndex >= 0 ? ranked[myIndex].completedCount : 0,
      streak: computeStreak(myCompletions.map((p) => p.updatedAt)),
    },
  });
});