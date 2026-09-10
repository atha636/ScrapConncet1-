const Pickup = require("../models/Pickup");
const Rating = require("../models/Rating");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { computeStreak } = require("../utils/streak");
const { buildReliabilityStats } = require("../utils/reliabilityStats");

const WINDOW_DAYS = 7;
const TOP_N = 10;
// Caps how many of a collector's own completed pickups get pulled to
// compute their streak — no realistic streak spans more than a year of
// daily completions, so this is a safe, generous ceiling that keeps the
// query bounded rather than scanning a collector's entire multi-year
// history every time they open this page.
const STREAK_LOOKBACK_LIMIT = 400;
// How many of a collector's most recent written reviews to surface on their
// profile — a preview, not a full review history page, so this stays small.
const RECENT_REVIEWS_LIMIT = 3;

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

// Shared by both the authenticated and public profile endpoints below —
// same underlying stats either way, callers just differ in how much of the
// result they're allowed to see (see `public` flag).
async function buildCollectorProfile(collectorId, { public: isPublic } = {}) {
  const collector = await User.findOne({
    _id: collectorId,
    role: "collector",
  }).select("name rating ratingCount createdAt collectorSuspended");

  if (!collector) return null;

  // A suspended collector's authenticated profile still needs to show
  // through (a requester with an active pickup assigned to them has to see
  // that), but there's no reason to let a share link keep working — and
  // several good reasons not to (an already-earned link outliving the
  // account's standing, or a suspended collector generating fresh links to
  // send out). Treat it as "doesn't exist" for the public endpoint only.
  if (isPublic && collector.collectorSuspended) return null;

  const completedCount = await Pickup.countDocuments({
    collector: collector._id,
    status: "completed",
  });

  const recentCompletions = await Pickup.find({ collector: collector._id, status: "completed" })
    .select("updatedAt")
    .sort({ updatedAt: -1 })
    .limit(STREAK_LOOKBACK_LIMIT);

  // Only ratings left with an actual written comment are worth surfacing
  // here — a bare star score with nothing written adds no more signal than
  // the aggregate `rating` average already shown above it.
  const recentReviews = await Rating.find({
    toUser: collector._id,
    comment: { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .limit(RECENT_REVIEWS_LIMIT)
    .populate("fromUser", "name");

  // Every Pickup with `collector` set was, by construction, accepted by
  // them at some point (collector is only ever assigned inside acceptPickup,
  // alongside pushing an "accepted" statusHistory entry — see that
  // function) — so this $match alone is every job this collector has ever
  // taken on, no separate "ever accepted" filter needed.
  //
  // $arrayElemAt over a $filter'd statusHistory (rather than, say,
  // `statusHistory.$` in the query itself) because we need two different
  // entries per document — the "accepted" one and, only for jobs that ended
  // in cancellation, the "cancelled" one — and a positional operator can
  // only ever project one match per array per query.
  const [reliabilityRaw] = await Pickup.aggregate([
    { $match: { collector: collector._id } },
    {
      $addFields: {
        acceptedEntry: {
          $arrayElemAt: [
            { $filter: { input: "$statusHistory", cond: { $eq: ["$$this.status", "accepted"] } } },
            0,
          ],
        },
        // Distinguishes a collector backing out after accepting from a
        // requester cancelling on them — only the former should ever count
        // against the collector's own completion rate (see
        // reliabilityStats.js for where that split actually matters).
        cancelledByCollectorEntry: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$statusHistory",
                cond: {
                  $and: [
                    { $eq: ["$$this.status", "cancelled"] },
                    { $eq: ["$$this.changedBy", collector._id] },
                  ],
                },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        // $sum/$divide silently treat a null operand (an accepted entry
        // that's somehow missing) as contributing 0 rather than erroring
        // the whole aggregation — acceptedCount below is what actually
        // gates whether this sum gets divided into anything meaningful.
        totalAcceptMinutes: {
          $sum: { $divide: [{ $subtract: ["$acceptedEntry.changedAt", "$createdAt"] }, 60000] },
        },
        acceptedCount: { $sum: { $cond: [{ $ifNull: ["$acceptedEntry", false] }, 1, 0] } },
        completedCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        collectorCancelledCount: {
          $sum: { $cond: [{ $ifNull: ["$cancelledByCollectorEntry", false] }, 1, 0] },
        },
      },
    },
  ]);

  const reliability = buildReliabilityStats(
    reliabilityRaw || {
      totalAcceptMinutes: 0,
      acceptedCount: 0,
      completedCount: 0,
      collectorCancelledCount: 0,
    }
  );

  return {
    id: collector._id,
    name: collector.name,
    rating: collector.rating,
    ratingCount: collector.ratingCount,
    completedCount,
    memberSince: collector.createdAt,
    streak: computeStreak(recentCompletions.map((p) => p.updatedAt)),
    avgAcceptMinutes: reliability.avgAcceptMinutes,
    completionRate: reliability.completionRate,
    // Meaningless on the public payload (suspended collectors never reach
    // here — see above) so leave it off rather than send a field that's
    // always false and could imply a promise it isn't making.
    ...(isPublic ? {} : { suspended: collector.collectorSuspended }),
    // fromUser can be null if that account was since deleted (see User's
    // soft-delete via deletedAt) — fall back to a generic label rather than
    // letting the review silently disappear or the response error out.
    // On the public payload, a reviewer's full name goes out to anyone
    // holding the link (not just the other party on a shared pickup, like
    // the authenticated version), so trim it down to a first name — enough
    // to read as a real person, not enough to identify one.
    recentReviews: recentReviews.map((r) => ({
      id: r._id,
      score: r.score,
      comment: r.comment,
      fromName: isPublic
        ? r.fromUser?.name?.split(" ")[0] || "A requester"
        : r.fromUser?.name || "A requester",
      createdAt: r.createdAt,
    })),
  };
}

// GET /api/pickup/collector/:id/profile  (any authenticated user — this is
// what a requester sees about the collector on their pickup, so it can't be
// collector-only the way the leaderboard is).
//
// Deliberately a narrow, hand-picked projection rather than `User.findById`
// — this is reachable by any logged-in requester who knows (or guesses) a
// collector's id, not just the two parties on a shared pickup, so nothing
// here should be more sensitive than what already appears elsewhere in the
// product (name/rating are already shown on pickup cards; phone is not,
// and stays out of this endpoint accordingly).
exports.getCollectorProfile = asyncHandler(async (req, res) => {
  const profile = await buildCollectorProfile(req.params.id);
  if (!profile) throw new ApiError(404, "Collector not found");
  res.json(profile);
});

// GET /api/pickup/collector/:id/profile/public  (no auth — this is the
// endpoint behind a collector's "Copy profile link" share button, so it has
// to work for a logged-out visitor, not just an existing requester).
//
// Reuses the exact same stats as the authenticated version, just with the
// couple of fields above trimmed for an audience that isn't limited to
// people the collector has actually done a pickup for. Rate-limited more
// tightly than the general API ceiling (see app.js) since, unlike the
// authenticated route, there's no login step slowing down enumeration —
// this is the only unauthenticated per-id lookup in the whole API surface.
exports.getPublicCollectorProfile = asyncHandler(async (req, res) => {
  const profile = await buildCollectorProfile(req.params.id, { public: true });
  if (!profile) throw new ApiError(404, "Collector not found");
  res.json(profile);
});