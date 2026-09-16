const User = require("../models/User");
const Pickup = require("../models/Pickup");
const Referral = require("../models/Referral");
const asyncHandler = require("../utils/asyncHandler");
const { buildReliabilityStats } = require("../utils/reliabilityStats");
const { PICKUP_MILESTONES } = require("../utils/badges");

// GET /api/admin/growth-stats
//
// The counterpart to getAnalytics' pickup-volume/revenue trend — this is
// everything built on top of that during this project's reputation/growth
// work (badges, referrals, reliability) that otherwise has no admin-facing
// view at all. A snapshot/breakdown, not a daily time series (unlike
// getAnalytics), since "how many collectors hold each badge right now" is
// the kind of number that's meaningful as a current state, not a trend
// line.
exports.getGrowthStats = asyncHandler(async (req, res) => {
  const [referralStats, badgeCounts, reliabilitySnapshot] = await Promise.all([
    getReferralStats(),
    getBadgeCounts(),
    getReliabilitySnapshot(),
  ]);

  res.json({ referrals: referralStats, badges: badgeCounts, reliability: reliabilitySnapshot });
});

async function getReferralStats() {
  const [totals, rewardAgg] = await Promise.all([
    Referral.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Referral.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$rewardAmount" } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(totals.map((t) => [t._id, t.count]));
  const pending = byStatus.pending || 0;
  const completed = byStatus.completed || 0;
  const total = pending + completed;

  return {
    total,
    pending,
    completed,
    totalRewardPaid: rewardAgg[0]?.total || 0,
    // Null rather than 0 with no referrals at all — a program with zero
    // signups and a program with a genuine 0% conversion rate are very
    // different situations for an admin to see at a glance, and
    // conflating them into the same number would hide that.
    conversionRate: total > 0 ? completed / total : null,
  };
}

// Reads straight from User.earnedBadgeIds (the snapshot badgeNotifier
// keeps in sync — see badgeNotifier.js) rather than recomputing live
// badge state for every collector, which would mean one
// getCollectorBadgeState-sized aggregation per collector instead of one
// aggregation total. The tradeoff: a collector whose badges were never
// actually synced (no accept/completion/rating event has fired for them
// yet, e.g. freshly imported data) won't be counted here even if they'd
// technically qualify — acceptable, since badgeNotifier fires on every
// real event that could earn a badge, so this only ever lags reality for
// an account with no real activity to sync from in the first place.
async function getBadgeCounts() {
  const counts = await User.aggregate([
    { $match: { role: "collector", earnedBadgeIds: { $exists: true, $ne: [] } } },
    { $unwind: "$earnedBadgeIds" },
    { $group: { _id: "$earnedBadgeIds", count: { $sum: 1 } } },
  ]);

  const byId = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  return {
    // Ordered lowest-to-highest tier, same order PICKUP_MILESTONES itself
    // is defined in, rather than however Mongo happened to return groups
    // — a chart reading these in ascending order is the whole point.
    milestones: PICKUP_MILESTONES.map((m) => ({ id: m.id, label: m.label, count: byId[m.id] || 0 })),
    topRated: byId.top_rated || 0,
    fastResponder: byId.fast_responder || 0,
    reliable: byId.reliable || 0,
  };
}

// A platform-wide *average of each collector's own rate*, not a single
// blended ratio across every pickup — the latter would let a handful of
// high-volume collectors dominate the number, while this answers "what
// does a typical established collector's reliability look like," which is
// the more useful question for an admin gauging overall platform health.
async function getReliabilitySnapshot() {
  const perCollectorRaw = await Pickup.aggregate([
    { $match: { collector: { $ne: null } } },
    {
      $addFields: {
        acceptedEntry: {
          $arrayElemAt: [
            { $filter: { input: "$statusHistory", cond: { $eq: ["$$this.status", "accepted"] } } },
            0,
          ],
        },
        cancelledByCollectorEntry: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$statusHistory",
                cond: {
                  $and: [
                    { $eq: ["$$this.status", "cancelled"] },
                    { $eq: ["$$this.changedBy", "$collector"] },
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
        _id: "$collector",
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

  // Reuses the exact same pure function collectorBadgeState.js calls for a
  // single collector's own profile — applied here per-collector so the
  // sample-size floors that make an individual profile trustworthy (see
  // reliabilityStats.js) apply the same way to this platform-wide number.
  // A collector below the floor contributes nothing rather than a
  // misleadingly precise 0% or 100% from a tiny sample.
  const perCollector = perCollectorRaw.map((c) => buildReliabilityStats(c));

  const acceptTimes = perCollector.map((c) => c.avgAcceptMinutes).filter((v) => v != null);
  const completionRates = perCollector.map((c) => c.completionRate).filter((v) => v != null);

  const average = (arr) => (arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : null);

  return {
    collectorsWithEnoughHistory: completionRates.length,
    avgCompletionRate: average(completionRates),
    avgAcceptMinutes: average(acceptTimes),
  };
}