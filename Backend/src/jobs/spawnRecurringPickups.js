const RecurringPickup = require("../models/RecurringPickup");
const Pickup = require("../models/Pickup");
const { estimatePrice } = require("../utils/pricing");
const { computeNextRun } = require("../utils/recurrence");
const notifyUser = require("../utils/notifyUser");

// Kept as a plain function (not wired directly into node-cron), same as
// escalateStalePickups — testable on demand without waiting on real
// timers, and the cron schedule in server.js is just "call this every N
// minutes."
async function spawnRecurringPickups(io) {
  const due = await RecurringPickup.find({ active: true, nextRunAt: { $lte: new Date() } });

  let created = 0;

  for (const template of due) {
    const pickup = await Pickup.create({
      user: template.user,
      scrapType: template.scrapType,
      estimatedWeightKg: template.estimatedWeightKg,
      contactName: template.contactName,
      contactPhone: template.contactPhone,
      location: template.location,
      price: estimatePrice(template.scrapType, template.estimatedWeightKg),
      statusHistory: [{ status: "pending", changedBy: template.user }],
    });

    // Anchored to the template's own previous nextRunAt, not to "now" — see
    // the comment on computeNextRun for why: this is what keeps a series on
    // its original cadence even if the cron job ever runs a little late.
    template.nextRunAt = computeNextRun(template.frequency, template.nextRunAt);
    template.lastPickupCreatedAt = new Date();
    await template.save();

    // Reuses the exact same event collector dashboards already listen to
    // for live list updates — a spawned pickup shows up for nearby
    // collectors in real time with zero new frontend wiring.
    io.emit("newPickup", pickup);

    await notifyUser(io, template.user, {
      type: "status_update",
      text: `Your recurring ${template.scrapType} pickup has been scheduled for today.`,
      pickupId: pickup._id,
    });

    created += 1;
  }

  return created;
}

module.exports = { spawnRecurringPickups };