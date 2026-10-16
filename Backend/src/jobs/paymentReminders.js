const Pickup = require("../models/Pickup");
const notifyUser = require("../utils/notifyUser");

const COLLECTOR_AFTER_HOURS = 6; // completed but still unpaid
const REQUESTER_AFTER_HOURS = 12; // "I've paid" waiting for a confirmation

// One gentle reminder per side, claimed atomically so overlapping runs
// can't double-send. Never auto-confirms: only the requester can say money
// arrived.
async function paymentReminders(io) {
  const now = Date.now();

  const unpaid = await Pickup.find({
    status: "completed",
    "settlement.status": { $in: ["none", "auto_confirmed", "confirmed", "resolved"] },
    "payment.status": { $in: [null, "unpaid"] },
    "payment.collectorRemindedAt": null,
    updatedAt: { $lt: new Date(now - COLLECTOR_AFTER_HOURS * 3600000) },
    // Only recent completions — older history shouldn't suddenly nag.
    createdAt: { $gt: new Date(now - 14 * 24 * 3600000) },
  }).limit(200);
  for (const p of unpaid) {
    const claimed = await Pickup.findOneAndUpdate(
      { _id: p._id, "payment.collectorRemindedAt": null },
      { $set: { "payment.collectorRemindedAt": new Date() } }
    );
    if (!claimed) continue;
    await notifyUser(io, p.assignedTo || p.collector, {
      type: "status_update",
      text: `Payment pending: please pay ₹${p.price} for your completed ${p.scrapType} pickup and mark it as paid.`,
      pickupId: p._id,
    });
  }

  const waiting = await Pickup.find({
    "payment.status": "claimed",
    "payment.requesterRemindedAt": null,
    "payment.claimedAt": { $lt: new Date(now - REQUESTER_AFTER_HOURS * 3600000) },
  }).limit(200);
  for (const p of waiting) {
    const claimed = await Pickup.findOneAndUpdate(
      { _id: p._id, "payment.requesterRemindedAt": null },
      { $set: { "payment.requesterRemindedAt": new Date() } }
    );
    if (!claimed) continue;
    await notifyUser(io, p.user, {
      type: "status_update",
      text: `Did you receive ₹${p.payment.amount} for your ${p.scrapType} pickup? Please confirm, or tell us if it hasn't arrived.`,
      pickupId: p._id,
    });
  }

  return { collectorReminded: unpaid.length, requesterReminded: waiting.length };
}

module.exports = { paymentReminders };