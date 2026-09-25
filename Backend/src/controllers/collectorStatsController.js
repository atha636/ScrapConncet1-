const mongoose = require("mongoose");
const Pickup = require("../models/Pickup");
const Rating = require("../models/Rating");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { computeStreak } = require("../utils/streak");
const { getCollectorBadgeState } = require("../services/collectorBadgeState");
const { getBadgeProgress } = require("../utils/badges");

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

  // completedCount, reliability numbers, and badges all come from one
  // shared computation (see collectorBadgeState.js) — the same numbers
  // badgeNotifier checks after a pickup/rating event, extracted there so
  // the two call sites can never drift into disagreeing about what a
  // collector's current badges actually are.
  const { completedCount, avgAcceptMinutes, completionRate, badges } = await getCollectorBadgeState(
    collector._id,
    collector
  );

  return {
    id: collector._id,
    name: collector.name,
    rating: collector.rating,
    ratingCount: collector.ratingCount,
    completedCount,
    memberSince: collector.createdAt,
    streak: computeStreak(recentCompletions.map((p) => p.updatedAt)),
    avgAcceptMinutes,
    completionRate,
    // Every input here is already public elsewhere on this same payload
    // (completedCount, rating, the two reliability numbers above), so
    // there's nothing badge-specific to strip for the public variant —
    // unlike `suspended` and `recentReviews` below, this line doesn't need
    // an isPublic branch at all.
    badges,
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

// GET /api/pickup/collector/:id/reviews  (no auth — same audience as the
// public profile share link, and linked from both it and the authenticated
// profile card's "See all reviews" button).
//
// Always trims reviewer names to first-name-only, unlike
// buildCollectorProfile's own isPublic branch — that split exists there
// because the *authenticated* profile card is only ever shown to the one
// requester paired with this collector on a real pickup, a natural,
// bounded audience. A full paginated review history has no such pairing to
// lean on (it's just as reachable from the public share link as from
// inside the app), so it consistently uses the same narrower name shown to
// a logged-out visitor rather than switching behavior based on who's
// asking.
exports.getCollectorReviews = asyncHandler(async (req, res) => {
  const collector = await User.findOne({ _id: req.params.id, role: "collector" }).select(
    "collectorSuspended"
  );
  // Same rule as the public profile endpoint: a suspended collector's
  // review history stops being reachable through this link too, rather
  // than one endpoint enforcing it and the other quietly leaving a side
  // door open to the same data.
  if (!collector || collector.collectorSuspended) throw new ApiError(404, "Collector not found");

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { toUser: collector._id, comment: { $exists: true, $ne: "" } };

  const [reviews, total] = await Promise.all([
    Rating.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("fromUser", "name"),
    Rating.countDocuments(filter),
  ]);

  res.json({
    data: reviews.map((r) => ({
      id: r._id,
      score: r.score,
      comment: r.comment,
      fromName: r.fromUser?.name?.split(" ")[0] || "A requester",
      createdAt: r.createdAt,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

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

// GET /api/pickup/collector/achievements  (collector only, self only — no
// :id param, always req.user.id).
//
// Deliberately scoped to "my own achievements" rather than "any collector's
// achievements by id": the earned badges on a profile are fine to show a
// stranger (see buildCollectorProfile's `badges` field, shared on both the
// authenticated and public payloads), but *progress toward a locked one* —
// "4 of 10 ratings toward Top Rated" — is a level of detail about someone
// else's business that nobody but that collector has a reason to see.
exports.getMyAchievements = asyncHandler(async (req, res) => {
  const collector = await User.findById(req.user.id).select("rating ratingCount");
  if (!collector) throw new ApiError(404, "Collector not found");

  const { avgAcceptMinutes, completionRate, completedCount } = await getCollectorBadgeState(
    collector._id,
    collector
  );

  res.json(
    getBadgeProgress({
      completedCount,
      rating: collector.rating,
      ratingCount: collector.ratingCount,
      avgAcceptMinutes,
      completionRate,
    })
  );
});

// Fixed timezone, same reasoning and same zone as
// utils/collectorAvailability.js's own TIMEZONE — this app is India-only,
// so a single hardcoded zone for "which day/hour did this happen in" is a
// deliberate simplification, not an oversight. Not imported from that
// file since this needs it applied to an arbitrary historical Date, not
// just "now".
const INSIGHTS_TIMEZONE = "Asia/Kolkata";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayAndHourInTimezone(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INSIGHTS_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = get("hour");
  if (hour === "24") hour = "00";
  return { day: weekdayMap[get("weekday")], hour: Number(hour) };
}

// How many of a collector's most recent completions to look at for the
// busiest-day/hour pattern — a real work pattern, not this week's noise,
// so it deliberately looks further back than the week-over-week numbers
// below. Same order-of-magnitude ceiling as STREAK_LOOKBACK_LIMIT above,
// for the same reason: bounds the query without needing a realistic
// collector's full multi-year history.
const PATTERN_LOOKBACK_LIMIT = 300;

// GET /api/pickup/collector/performance  (collector only)
//
// Deliberately additive, not a rebuild of what already exists: wallet's
// getSummary already covers all-time/7-day/30-day earnings, and
// getCollectorBadgeState already covers all-time acceptance speed and
// completion rate. What neither answers is "is this week better or worse
// than last week" or "when do I actually tend to work" — this fills
// exactly those two gaps and nothing else.
exports.getPerformanceInsights = asyncHandler(async (req, res) => {
  const collectorId = req.user.id;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startOfThisWeek = new Date(now.getTime() - 7 * DAY_MS);
  const startOfLastWeek = new Date(now.getTime() - 14 * DAY_MS);

  const [completedCounts, earningsBuckets, ratingBuckets, pattern] = await Promise.all([
    Pickup.aggregate([
      { $match: { collector: new mongoose.Types.ObjectId(collectorId), status: "completed", updatedAt: { $gte: startOfLastWeek } } },
      {
        $group: {
          _id: { $cond: [{ $gte: ["$updatedAt", startOfThisWeek] }, "thisWeek", "lastWeek"] },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { collector: new mongoose.Types.ObjectId(collectorId), type: "earning", createdAt: { $gte: startOfLastWeek } } },
      {
        $group: {
          _id: { $cond: [{ $gte: ["$createdAt", startOfThisWeek] }, "thisWeek", "lastWeek"] },
          sum: { $sum: "$amount" },
        },
      },
    ]),
    Rating.aggregate([
      { $match: { toUser: new mongoose.Types.ObjectId(collectorId), createdAt: { $gte: startOfLastWeek } } },
      {
        $group: {
          _id: { $cond: [{ $gte: ["$createdAt", startOfThisWeek] }, "thisWeek", "lastWeek"] },
          avg: { $avg: "$score" },
          count: { $sum: 1 },
        },
      },
    ]),
    // Mongo aggregation can't cheaply bucket by an IANA-timezone weekday/
    // hour — $dateToString's timezone option formats the string but
    // offers nothing to group weekday-of-week by name — so this pulls
    // just the timestamps and buckets them in JS with the same
    // Intl.DateTimeFormat approach isCollectorAvailableNow already uses
    // for the same underlying reason.
    Pickup.find({ collector: collectorId, status: "completed" })
      .select("updatedAt")
      .sort({ updatedAt: -1 })
      .limit(PATTERN_LOOKBACK_LIMIT),
  ]);

  const bucketOf = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));
  const completedBy = bucketOf(completedCounts);
  const earningsBy = bucketOf(earningsBuckets);
  const ratingBy = bucketOf(ratingBuckets);

  const dayCounts = new Array(7).fill(0);
  const hourCounts = new Array(24).fill(0);
  for (const p of pattern) {
    const { day, hour } = dayAndHourInTimezone(p.updatedAt);
    dayCounts[day] += 1;
    hourCounts[hour] += 1;
  }
  const busiestDayIdx = pattern.length ? dayCounts.indexOf(Math.max(...dayCounts)) : null;
  const busiestHourIdx = pattern.length ? hourCounts.indexOf(Math.max(...hourCounts)) : null;

  res.json({
    completed: {
      thisWeek: completedBy.thisWeek?.count || 0,
      lastWeek: completedBy.lastWeek?.count || 0,
    },
    earned: {
      thisWeek: earningsBy.thisWeek?.sum || 0,
      lastWeek: earningsBy.lastWeek?.sum || 0,
    },
    avgRating: {
      thisWeek: ratingBy.thisWeek ? Number(ratingBy.thisWeek.avg.toFixed(2)) : null,
      lastWeek: ratingBy.lastWeek ? Number(ratingBy.lastWeek.avg.toFixed(2)) : null,
    },
    busiest:
      pattern.length > 0
        ? {
            day: DAY_NAMES[busiestDayIdx],
            hour: busiestHourIdx,
            sampleSize: pattern.length,
          }
        : null,
  });
});