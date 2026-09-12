const Pickup = require("../models/Pickup");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { buildReliabilityStats } = require("../utils/reliabilityStats");
const { computeBadges } = require("../utils/badges");

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

  const completedCount = await Pickup.countDocuments({
    user: requester._id,
    status: "completed",
  });

  // Mirrors buildCollectorProfile's own aggregation (see
  // collectorStatsController.js) with one deliberate difference: a
  // requester cancelling a still-*pending* request (no collector assigned
  // yet) costs nobody anything and shouldn't touch this number — only a
  // cancellation that happened after a collector had already committed to
  // the job counts against them, hence the `collector: { $ne: null }`
  // match up front rather than matching every pickup this requester ever
  // created.
  const [reliabilityRaw] = await Pickup.aggregate([
    { $match: { user: requester._id, collector: { $ne: null } } },
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
                    { $eq: ["$$this.changedBy", requester._id] },
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

  // Reused as-is from the collector side — the function itself only cares
  // about "completed vs. this-party-cancelled" counts, nothing collector-
  // specific in its logic. avgAcceptMinutes has no requester equivalent
  // (there's no "accepting" step on this side of a pickup), so the accept-
  // time inputs are just zeroed out, which buildReliabilityStats already
  // turns into a null avgAcceptMinutes below the sample floor — exactly
  // the "not applicable" result wanted here.
  const reliability = buildReliabilityStats({
    totalAcceptMinutes: 0,
    acceptedCount: 0,
    completedCount: reliabilityRaw?.completedCount || 0,
    collectorCancelledCount: reliabilityRaw?.requesterCancelledCount || 0,
  });

  res.json({
    id: requester._id,
    name: requester.name,
    rating: requester.rating,
    ratingCount: requester.ratingCount,
    completedCount,
    memberSince: requester.createdAt,
    completionRate: reliability.completionRate,
    // avgAcceptMinutes and the streak flame are collector-only concepts
    // (see CollectorProfileCard) — deliberately absent here rather than
    // sent as an always-null field a requester-facing UI would have no use
    // for.
    badges: computeBadges({
      completedCount,
      rating: requester.rating,
      ratingCount: requester.ratingCount,
      avgAcceptMinutes: null,
      completionRate: reliability.completionRate,
    }),
  });
});