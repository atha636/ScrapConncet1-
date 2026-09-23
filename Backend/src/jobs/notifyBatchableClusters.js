const User = require("../models/User");
const notifyUser = require("../utils/notifyUser");
const { findSuggestedBatch } = require("../utils/suggestedBatch");
const { isCollectorAvailableNow } = require("../utils/collectorAvailability");

// A position older than this is treated as too stale to alert against —
// a collector who hasn't opened the app or touched the dashboard in this
// window may well have moved on, and pinging them about pickups "near"
// where they used to be would be a false promise.
const LOCATION_FRESHNESS_MINUTES = parseInt(process.env.BATCH_ALERT_FRESHNESS_MINUTES) || 20;

// Floor on how often the *same* collector can be re-alerted, independent
// of whether the cluster changed — keeps this from ever firing more
// often than a collector could reasonably act on it, even if candidate
// pickups are churning quickly in their area.
const NOTIFY_COOLDOWN_MINUTES = parseInt(process.env.BATCH_ALERT_COOLDOWN_MINUTES) || 15;

// Below this, it's just the everyday "one pickup nearby" case every
// collector already sees on the live Available feed — not worth a push
// of its own.
const MIN_BATCH_SIZE = 2;

/**
 * Scans available collectors with a recent known position and, wherever a
 * genuinely batchable cluster of pending pickups has formed nearby, sends
 * a push so they can find out before they even open the app — the
 * background counterpart to GET /collector/suggested-batch, which only
 * ever answers when a collector happens to be looking.
 *
 * Kept as a plain function taking `io`, not wired directly into
 * node-cron, for the same reason as the other jobs in this folder: the
 * cron schedule in server.js is just "call this every N minutes," none of
 * the alerting logic itself depends on it.
 */
async function notifyBatchableClusters(io) {
  const freshSince = new Date(Date.now() - LOCATION_FRESHNESS_MINUTES * 60 * 1000);
  const cooldownSince = new Date(Date.now() - NOTIFY_COOLDOWN_MINUTES * 60 * 1000);

  const candidates = await User.find({
    role: "collector",
    collectorSuspended: false,
    "lastKnownLocation.updatedAt": { $gte: freshSince },
    $or: [{ "lastBatchAlert.notifiedAt": { $exists: false } }, { "lastBatchAlert.notifiedAt": { $lt: cooldownSince } }],
  }).select("collectorPreferences lastKnownLocation lastBatchAlert collectorPaused availabilitySchedule collectorSuspended");

  let alerted = 0;

  for (const collector of candidates) {
    if (!isCollectorAvailableNow(collector)) continue;

    const start = { lat: collector.lastKnownLocation.lat, lng: collector.lastKnownLocation.lng };
    const radiusKm = collector.collectorPreferences?.radiusKm || 25;

    const { ids, stops, totalKm } = await findSuggestedBatch(start, { radiusKm });
    if (stops.length < MIN_BATCH_SIZE) continue;

    // Same cluster as last time, cooldown or not — re-sending the exact
    // same alert the moment the cooldown lapses would just be spam with
    // extra steps. A genuinely different set of ids (one accepted by
    // someone else, a new one joined, etc.) always clears this check.
    const sameAsLastTime =
      collector.lastBatchAlert?.pickupIds?.length === ids.length &&
      [...collector.lastBatchAlert.pickupIds].sort().join(",") === [...ids].sort().join(",");
    if (sameAsLastTime) continue;

    await notifyUser(io, collector._id, {
      type: "batch_available",
      text: `${stops.length} pickups are bunched within ~${totalKm} km of you — open Available to grab them in one trip.`,
    });

    collector.lastBatchAlert = { pickupIds: ids, notifiedAt: new Date() };
    await collector.save();
    alerted += 1;
  }

  return alerted;
}

module.exports = { notifyBatchableClusters, LOCATION_FRESHNESS_MINUTES, NOTIFY_COOLDOWN_MINUTES };