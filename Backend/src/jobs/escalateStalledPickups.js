const Pickup = require("../models/Pickup");
const notifyUser = require("../utils/notifyUser");
const { STALLED_PICKUP_MINUTES } = require("../utils/reliabilityRules");

// Kept as a plain function (not wired directly into node-cron), same
// reasoning as escalateStalePickups.js — testable on demand, independent
// of the actual cron schedule in server.js.
async function escalateStalledPickups(io) {
  const stalledBefore = new Date(Date.now() - STALLED_PICKUP_MINUTES * 60 * 1000);

  // "Accepted long enough ago" is read off statusHistory rather than a
  // separate acceptedAt field — the pickup schema already records every
  // transition there (see Pickup.pushHistory). Filtered down to
  // status: "accepted" here (a much smaller set than the whole
  // collection), then each candidate's *most recent* "accepted" entry is
  // checked in JS below rather than with a query-level $elemMatch: a
  // pickup that was reported as a no-show and re-accepted by a different
  // collector still has its original, long-stale "accepted" entry
  // sitting in statusHistory, and $elemMatch would match on that old
  // entry alone — incorrectly flagging a collector who just accepted
  // moments ago. Only the latest "accepted" entry reflects who's
  // actually holding the job right now.
  const candidates = await Pickup.find({ status: "accepted", isStalled: false });

  const stalledPickups = candidates.filter((pickup) => {
    const lastAccepted = [...pickup.statusHistory].reverse().find((h) => h.status === "accepted");
    return lastAccepted && lastAccepted.changedAt <= stalledBefore;
  });

  for (const pickup of stalledPickups) {
    pickup.isStalled = true;
    pickup.stalledAt = new Date();
    await pickup.save();

    io.emit("updatePickup", pickup);

    // The requester, not the collector — this is the signal that lets
    // them see the "report no-show" option appear (see
    // pickupController.reportNoShow), not a nudge aimed at the collector
    // who's already gone quiet.
    await notifyUser(io, pickup.user, {
      type: "status_update",
      text: `Your collector for the ${pickup.scrapType} pickup hasn't started yet — you can report a no-show if they don't respond`,
      pickupId: pickup._id,
    });
  }

  return stalledPickups.length;
}

module.exports = { escalateStalledPickups, STALLED_PICKUP_MINUTES };