const RecurringPickup = require("../models/RecurringPickup");
const Pickup = require("../models/Pickup");
const { estimatePrice } = require("../utils/pricing");
const { computeNextRun, firstRunOnOrAfter } = require("../utils/recurrence");
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
    //
    // One spawn per run, then jump to the first on-cadence date that's
    // actually in the future. Stepping just once would leave a template
    // that fell several intervals behind (server down for a few weeks)
    // still "due" and spawn one stale pickup per hourly run until it
    // caught up — a burst of duplicates instead of a single pickup.
    //
    // The target is one millisecond past now because firstRunOnOrAfter is
    // inclusive: a next run landing exactly on "now" would still be due
    // on the very next tick and spawn a duplicate.
    template.nextRunAt = firstRunOnOrAfter(
      template.frequency,
      computeNextRun(template.frequency, template.nextRunAt),
      new Date(Date.now() + 1)
    );
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

// How far ahead of a scheduled pickup the reminder goes out. Skipping is
// only useful if the requester finds out in time to use it, and a pickup
// that appears without warning is exactly when they'd want to have.
const REMINDER_LEAD_HOURS = 24;

async function remindUpcomingRecurring(io) {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_LEAD_HOURS * 60 * 60 * 1000);

  // remindedForRunAt is compared to nextRunAt, not just "was ever
  // reminded" — so skipping, pausing, or the next cycle each earn a fresh
  // reminder without any reset step. Null (never reminded) matches too.
  const upcoming = await RecurringPickup.find({
    active: true,
    nextRunAt: { $gt: now, $lte: horizon },
  });

  let reminded = 0;
  for (const template of upcoming) {
    if (template.remindedForRunAt && template.remindedForRunAt.getTime() === template.nextRunAt.getTime()) continue;

    // Marked before sending so a failed notification is a missed reminder,
    // not a reminder repeated every hour until it happens to succeed.
    template.remindedForRunAt = template.nextRunAt;
    await template.save();

    await notifyUser(io, template.user, {
      type: "status_update",
      text: `Your ${template.frequency} ${template.scrapType} pickup will be scheduled tomorrow. Not needed this time? Skip it from My Requests.`,
    });
    reminded += 1;
  }

  return reminded;
}

module.exports = { spawnRecurringPickups, remindUpcomingRecurring, REMINDER_LEAD_HOURS };