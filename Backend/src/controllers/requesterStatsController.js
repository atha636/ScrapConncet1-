const User = require("../models/User");
const Rating = require("../models/Rating");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getRequesterBadgeState } = require("../services/requesterBadgeState");

// How many of a requester's most recent written reviews (left by
// collectors about them) to surface — same limit and same reasoning as
// collectorStatsController's RECENT_REVIEWS_LIMIT: a preview, not a full
// history, so this stays small.
const RECENT_REVIEWS_LIMIT = 3;

async function fetchRecentReviews(requesterId) {
  const reviews = await Rating.find({
    toUser: requesterId,
    comment: { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .limit(RECENT_REVIEWS_LIMIT)
    .populate("fromUser", "name");

  return reviews.map((r) => ({
    id: r._id,
    score: r.score,
    comment: r.comment,
    fromName: r.fromUser?.name || "A collector",
    createdAt: r.createdAt,
  }));
}

// The symmetric counterpart to collectorStatsController's collector
// profile — this is what a collector sees about a requester, surfaced from
// the "Requested by X" line on the available-jobs list (see Dashboard.jsx)
// so a collector can size up who they'd be dealing with before accepting,
// same as a requester already can for a collector.
//
// GET /api/pickup/requester/:id/profile  (any authenticated user, same as
// getCollectorProfile — a collector browsing available jobs is the
// intended caller, but there's no reason to role-gate this any tighter
// than the mirror endpoint already is).
exports.getRequesterProfile = asyncHandler(async (req, res) => {
  const requester = await User.findOne({ _id: req.params.id, role: "user" }).select(
    "name rating ratingCount createdAt"
  );
  if (!requester) throw new ApiError(404, "Requester not found");

  const { completedCount, completionRate, badges } = await getRequesterBadgeState(
    requester._id,
    requester
  );
  const recentReviews = await fetchRecentReviews(requester._id);

  res.json({
    id: requester._id,
    name: requester.name,
    rating: requester.rating,
    ratingCount: requester.ratingCount,
    completedCount,
    memberSince: requester.createdAt,
    completionRate,
    // avgAcceptMinutes and the streak flame are collector-only concepts
    // (see CollectorProfileCard) — deliberately absent here rather than
    // sent as an always-null field a requester-facing UI would have no use
    // for.
    badges,
    recentReviews,
  });
});

// GET /api/pickup/requester/me/reputation  (requester only, self only — no
// :id param, always req.user.id).
//
// Third URL segment is "reputation", not "profile", so this can never
// collide with the /requester/:id/profile route above regardless of
// declaration order — a request for literal path "me" would otherwise risk
// being swallowed by :id if these two routes shared the same final
// segment and got declared in the wrong order (exactly the trap
// getMyAchievements' own routing comment calls out on the collector side).
//
// This is the "My Reputation" panel on a requester's own Profile page —
// the same rating/completion-rate/badges/reviews a collector already sees
// about them (see getRequesterProfile above), just for the requester
// themselves rather than someone deciding whether to accept their job.
exports.getMyReputation = asyncHandler(async (req, res) => {
  const requester = await User.findById(req.user.id).select("name rating ratingCount createdAt");
  if (!requester) throw new ApiError(404, "Requester not found");

  const { completedCount, completionRate, badges } = await getRequesterBadgeState(
    requester._id,
    requester
  );
  const recentReviews = await fetchRecentReviews(requester._id);

  res.json({
    rating: requester.rating,
    ratingCount: requester.ratingCount,
    completedCount,
    memberSince: requester.createdAt,
    completionRate,
    badges,
    recentReviews,
  });
});