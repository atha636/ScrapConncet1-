const Pickup = require("../models/Pickup");
const { buildReliabilityStats } = require("../utils/reliabilityStats");
const { computeBadges } = require("../utils/badges");

/**
 * Computes a collector's completedCount, reliability stats, and current
 * badges from live data — the exact same numbers collectorStatsController's
 * buildCollectorProfile shows on a profile page, extracted here so
 * badgeNotifier can ask "what badges does this collector have right now"
 * without duplicating the aggregation, and without needing the rest of
 * what a full profile fetches (recent reviews, streak) that a badge check
 * has no use for.
 *
 * @param {import("mongoose").Types.ObjectId} collectorId
 * @param {{ rating: number, ratingCount: number }} collector - already
 *   loaded by the caller (both call sites already have this document in
 *   hand for their own reasons), so this doesn't re-fetch it itself.
 */
async function getCollectorBadgeState(collectorId, collector) {
  const completedCount = await Pickup.countDocuments({
    collector: collectorId,
    status: "completed",
  });

  // Identical aggregation to buildCollectorProfile's own — see that
  // function's comments for why $arrayElemAt-over-$filter is used instead
  // of a positional projection, and why collector-cancelled is tracked
  // separately from requester-cancelled.
  const [reliabilityRaw] = await Pickup.aggregate([
    { $match: { collector: collectorId } },
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
                    { $eq: ["$$this.changedBy", collectorId] },
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

  const badges = computeBadges({
    completedCount,
    rating: collector.rating,
    ratingCount: collector.ratingCount,
    avgAcceptMinutes: reliability.avgAcceptMinutes,
    completionRate: reliability.completionRate,
  });

  return { completedCount, ...reliability, badges };
}

module.exports = { getCollectorBadgeState };