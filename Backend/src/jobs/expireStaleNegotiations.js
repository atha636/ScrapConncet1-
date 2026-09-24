const Pickup = require("../models/Pickup");
const notifyUser = require("../utils/notifyUser");

// How long a negotiation can sit waiting on a reply before it's treated
// as abandoned. Configurable via env for the same reason
// STALE_PICKUP_MINUTES is — tunable without a redeploy.
const STALE_NEGOTIATION_HOURS = parseInt(process.env.STALE_NEGOTIATION_HOURS) || 12;

// Per the Pickup model's own comment on `negotiation`, a pickup can only
// be in one active negotiation at a time — a second collector proposing
// while one is already in flight is rejected outright. That's the right
// call while a negotiation is actually live, but it has no expiry: if
// either party simply stops responding, the pickup is locked out of every
// *other* collector's offers indefinitely, with no way back except the
// original two parties. This is the fix — an ignored negotiation reverts
// to "declined" (exactly what a real decline does: frees the pickup for
// a fresh offer from anyone, collector included) rather than blocking the
// pickup forever.
async function expireStaleNegotiations(io) {
  const staleBefore = new Date(Date.now() - STALE_NEGOTIATION_HOURS * 60 * 60 * 1000);

  // Mongo can't cheaply query "the last element of this array is older
  // than X" without aggregation, and this app's negotiation volume never
  // justifies that complexity — narrowing to status: "pending" pickups
  // with a live negotiation first keeps the candidate set small before
  // the per-document check below.
  const candidates = await Pickup.find({
    status: "pending",
    "negotiation.status": "pending",
  });

  let expired = 0;

  for (const pickup of candidates) {
    const offers = pickup.negotiation.offers;
    const lastOffer = offers[offers.length - 1];
    if (!lastOffer || lastOffer.createdAt > staleBefore) continue;

    // Atomic guard against a race with a live respondToOffer call landing
    // between the find above and this update — same reasoning as every
    // other findOneAndUpdate filtered on negotiation.status in
    // pickupController.js.
    const updated = await Pickup.findOneAndUpdate(
      { _id: pickup._id, "negotiation.status": "pending" },
      { $set: { "negotiation.status": "declined", "negotiation.collector": null } },
      { new: true }
    );
    if (!updated) continue;

    io.emit("updatePickup", updated);

    // Whoever didn't make the last move is the one left hanging — that's
    // who actually needs telling their own offer just expired unanswered.
    const waitingPartyId = lastOffer.offeredBy === "requester" ? pickup.negotiation.collector : pickup.user;
    if (waitingPartyId) {
      await notifyUser(io, waitingPartyId, {
        type: "price_offer",
        text: `Your offer on the ${pickup.scrapType} pickup went unanswered and has expired — the listing is open again.`,
        pickupId: pickup._id,
      });
    }

    expired += 1;
  }

  return expired;
}

module.exports = { expireStaleNegotiations, STALE_NEGOTIATION_HOURS };