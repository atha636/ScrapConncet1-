const Pickup = require("../models/Pickup");
const { buildReliabilityStats } = require("../utils/reliabilityStats");
const { computeBadges } = require("../utils/badges");

/**
 * The requester-side mirror of collectorBadgeState.js — extracted the same
 * way, for the same reason: both getRequesterProfile (what a collector
 * sees about a requester) and getMyReputation (what a requester sees about
 * themselves) need the exact same numbers, and duplicating the aggregation
 * in two controllers is how those two views quietly drift apart over time.
 *
 * @param {import("mongoose").Types.ObjectId} requesterId
 * @param {{ rating: number, ratingCount: number }} requester - already
 *   loaded by the caller, same convention as collectorBadgeState.
 */
async function getRequesterBadgeState(requesterId, requester) {
  const completedCount = await Pickup.countDocuments({
    user: requesterId,
    status: "completed",
  });

  // Identical shape to requesterStatsController's original inline version
  // — matches only pickups a collector had already accepted
  // (`collector: { $ne: null }`), since cancelling a still-pending request
  // costs nobody anything and shouldn't touch this number.
  const [reliabilityRaw] = await Pickup.aggregate([
    { $match: { user: requesterId, collector: { $ne: null } } },
    {
      $addFields: {
        cancelledByThisRequesterEntry: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$statusHistory",
                cond: {
                  $and: [
                    { $eq: ["$$this.status", "cancelled"] },
                    { $eq: ["$$this.changedBy", requesterId] },
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
        completedCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        requesterCancelledCount: {
          $sum: { $cond: [{ $ifNull: ["$cancelledByThisRequesterEntry", false] }, 1, 0] },
        },
      },
    },
  ]);

  // avgAcceptMinutes has no requester equivalent (there's no "accepting"
  // step on this side of a pickup) — zeroed inputs here resolve to a null
  // avgAcceptMinutes below buildReliabilityStats' own sample floor, which
  // is exactly the "not applicable" result wanted.
  const reliability = buildReliabilityStats({
    totalAcceptMinutes: 0,
    acceptedCount: 0,
    completedCount: reliabilityRaw?.completedCount || 0,
    collectorCancelledCount: reliabilityRaw?.requesterCancelledCount || 0,
  });

  const badges = computeBadges({
    completedCount,
    rating: requester.rating,
    ratingCount: requester.ratingCount,
    avgAcceptMinutes: null,
    completionRate: reliability.completionRate,
  });

  return { completedCount, completionRate: reliability.completionRate, badges };
}

module.exports = { getRequesterBadgeState };