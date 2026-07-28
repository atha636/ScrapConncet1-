const Pickup = require("../models/Pickup");

// How long a pickup can sit "pending" with no collector before it's flagged
// urgent. Configurable via env so this can be tuned without a redeploy of
// code — only of the environment variable.
const STALE_PICKUP_MINUTES = parseInt(process.env.STALE_PICKUP_MINUTES) || 15;

// Kept as a plain function (not wired directly into node-cron) so it can be
// unit tested on demand instead of waiting on real timers — the cron
// schedule in server.js is just "call this function every N minutes",
// nothing about the escalation logic itself depends on it.
async function escalateStalePickups(io) {
  const staleBefore = new Date(Date.now() - STALE_PICKUP_MINUTES * 60 * 1000);

  const stalePickups = await Pickup.find({
    status: "pending",
    isUrgent: false,
    createdAt: { $lte: staleBefore },
  });

  for (const pickup of stalePickups) {
    pickup.isUrgent = true;
    pickup.urgentAt = new Date();
    await pickup.save();

    // Reuses the same event collector dashboards already listen to for
    // live list refreshes — no new frontend wiring needed to see this.
    io.emit("updatePickup", pickup);
  }

  return stalePickups.length;
}

module.exports = { escalateStalePickups, STALE_PICKUP_MINUTES };