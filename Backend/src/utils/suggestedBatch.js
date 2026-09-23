const Pickup = require("../models/Pickup");
const User = require("../models/User");
const { buildCluster, haversineKm } = require("./routeOptimizer");

// Candidate pool size for clustering — deliberately wider than a route
// ever needs since most candidates never make it into the final cluster
// (buildCluster trims down to maxStops), so this can afford to look at
// more pending pickups than get returned.
const MAX_BATCH_CANDIDATES = 60;

/**
 * Finds pending pickups near `start` and clusters them into a tight,
 * driveable batch — the one piece of logic behind both
 * GET /collector/suggested-batch (a collector asking on demand) and
 * jobs/notifyBatchableClusters.js (checking on their behalf in the
 * background). Kept here, not duplicated in each, so the two can never
 * quietly disagree about what counts as "batchable."
 *
 * @param {{lat: number, lng: number}} start
 * @param {{radiusKm?: number, maxStops?: number, maxLegKm?: number}} [options]
 */
async function findSuggestedBatch(start, { radiusKm = 25, maxStops = 6, maxLegKm = 3 } = {}) {
  // Same "don't surface a request tied to a deactivated account" guard
  // used everywhere else pending pickups are queried.
  const activeRequesterIds = await User.find({ isActive: true }).distinct("_id");

  const candidates = await Pickup.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [start.lng, start.lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        query: { status: "pending", user: { $in: activeRequesterIds } },
        spherical: true,
      },
    },
    { $limit: MAX_BATCH_CANDIDATES },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { name: 1, phone: 1 } }],
      },
    },
    { $unwind: "$user" },
  ]);

  const stops = candidates.map((c) => ({ id: String(c._id), lat: c.location.lat, lng: c.location.lng }));
  const { ordered, totalKm } = buildCluster(start, stops, { maxStops, maxLegKm });

  const candidatesById = Object.fromEntries(candidates.map((c) => [String(c._id), c]));

  const clusterStops = ordered.map((stop, index) => ({
    order: index + 1,
    pickup: candidatesById[stop.id],
    legKm: Number(
      (index === 0 ? haversineKm(start, stop) : haversineKm(ordered[index - 1], stop)).toFixed(2)
    ),
  }));

  return {
    stops: clusterStops,
    ids: clusterStops.map((s) => String(s.pickup._id)),
    totalKm: Number(totalKm.toFixed(2)),
    candidatesInRadius: candidates.length,
  };
}

module.exports = { findSuggestedBatch, MAX_BATCH_CANDIDATES };