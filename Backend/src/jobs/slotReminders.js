const Pickup = require("../models/Pickup");
const notifyUser = require("../utils/notifyUser");

const REMIND_BEFORE_MIN = 60;

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Runs every few minutes: reminds both sides an hour before a scheduled
// window opens, and flags a window that passed with the collector never
// having set off. Each flag is claimed atomically, so a pickup is only ever
// notified once even if two runs overlap.
async function slotReminders(io) {
  const now = new Date();

  const upcoming = await Pickup.find({
    status: "accepted",
    "slot.start": { $gt: now, $lte: new Date(now.getTime() + REMIND_BEFORE_MIN * 60000) },
    "tracking.reminderSentAt": null,
  });
  for (const p of upcoming) {
    const claimed = await Pickup.findOneAndUpdate(
      { _id: p._id, "tracking.reminderSentAt": null },
      { $set: { "tracking.reminderSentAt": now } }
    );
    if (!claimed) continue;
    const text = `Pickup window starts soon: ${fmtTime(p.slot.start)}–${fmtTime(p.slot.end)}.`;
    await notifyUser(io, p.user, { type: "status_update", text: `${text} Please be home with your scrap ready.`, pickupId: p._id });
    await notifyUser(io, p.assignedTo || p.collector, { type: "status_update", text: `${text} Tap "I'm on my way" when you leave.`, pickupId: p._id });
  }

  const missed = await Pickup.find({
    status: "accepted",
    "slot.end": { $lt: now },
    "tracking.onTheWayAt": null,
    "tracking.missedNotifiedAt": null,
  });
  for (const p of missed) {
    const claimed = await Pickup.findOneAndUpdate(
      { _id: p._id, "tracking.missedNotifiedAt": null },
      { $set: { "tracking.missedNotifiedAt": now } }
    );
    if (!claimed) continue;
    const text = "The scheduled pickup window has passed and the pickup hasn't started — please chat to agree a new time.";
    await notifyUser(io, p.user, { type: "status_update", text, pickupId: p._id });
    await notifyUser(io, p.assignedTo || p.collector, { type: "status_update", text, pickupId: p._id });
  }

  return { reminded: upcoming.length, missed: missed.length };
}

module.exports = { slotReminders };