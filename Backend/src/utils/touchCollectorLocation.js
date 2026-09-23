const User = require("../models/User");

/**
 * Opportunistically records where a collector was the moment they hit a
 * location-bearing endpoint (getAvailable, getCollectorRoute,
 * getSuggestedBatch) — not a live tracker, no new endpoint or frontend
 * work needed, just "the last place we know they asked from." This is
 * exactly the staleness jobs/notifyBatchableClusters.js needs and no
 * more: it only ever alerts a collector using a position fresh enough to
 * still be useful (see LOCATION_FRESHNESS_MINUTES there).
 *
 * Deliberately fire-and-forget: a write failure here should never fail
 * the request that triggered it, the same reasoning notifyUser.js uses
 * for push delivery being best-effort against its own critical path.
 */
function touchCollectorLocation(userId, lat, lng) {
  User.updateOne(
    { _id: userId },
    { $set: { lastKnownLocation: { lat, lng, updatedAt: new Date() } } }
  ).catch((err) => console.error("Failed to record collector location:", err.message));
}

module.exports = { touchCollectorLocation };