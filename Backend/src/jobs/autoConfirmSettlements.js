const Pickup = require("../models/Pickup");
const { finalizeSettlement } = require("../utils/settlement");

// A collector shouldn't wait on a requester who never opens the app: once
// the confirm window passes, the collector's weighed figure stands.
async function autoConfirmSettlements(io) {
  const due = await Pickup.find({
    "settlement.status": "pending_confirmation",
    "settlement.confirmAt": { $lte: new Date() },
  }).select("_id settlement.proposedPrice");

  let confirmed = 0;
  for (const p of due) {
    const done = await finalizeSettlement(io, p._id, {
      finalPrice: p.settlement.proposedPrice,
      status: "confirmed",
    });
    if (done) confirmed += 1;
  }
  return confirmed;
}

module.exports = { autoConfirmSettlements };