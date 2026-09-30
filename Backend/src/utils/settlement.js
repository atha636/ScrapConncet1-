const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const notifyUser = require("./notifyUser");
const { estimateItemsPrice } = require("./pricing");

// A weighed load within this % of what was estimated settles at the agreed
// price with no action from the requester. Bigger gaps need their OK.
const SETTLEMENT_TOLERANCE_PCT = parseFloat(process.env.SETTLEMENT_TOLERANCE_PCT) || 10;
// How long the requester has to confirm/dispute before it auto-confirms.
const SETTLEMENT_CONFIRM_HOURS = parseInt(process.env.SETTLEMENT_CONFIRM_HOURS) || 24;

function estimatedItemsOf(pickup) {
  return pickup.items && pickup.items.length > 0
    ? pickup.items.map((i) => ({ scrapType: i.scrapType, estimatedWeightKg: i.estimatedWeightKg }))
    : [{ scrapType: pickup.scrapType, estimatedWeightKg: pickup.estimatedWeightKg }];
}

// Compares the weighed load with the estimate on PRICE terms (so a small
// item of glass moving doesn't count the same as the same kg of metal),
// and scales the agreed price — negotiated or not — by that same ratio.
function computeSettlement(pickup, actualItems) {
  const estimatedBasePrice = estimateItemsPrice(estimatedItemsOf(pickup));
  const actualBasePrice = estimateItemsPrice(
    actualItems.map((i) => ({ scrapType: i.scrapType, estimatedWeightKg: i.actualWeightKg }))
  );
  const variancePct = (Math.abs(actualBasePrice - estimatedBasePrice) / estimatedBasePrice) * 100;
  const withinTolerance = variancePct <= SETTLEMENT_TOLERANCE_PCT;
  const proposedPrice = Math.max(1, Math.round((pickup.price * actualBasePrice) / estimatedBasePrice));

  return {
    estimatedBasePrice,
    actualBasePrice,
    variancePct: Math.round(variancePct * 10) / 10,
    withinTolerance,
    originalPrice: pickup.price,
    proposedPrice,
    // Within tolerance the agreed price stands unchanged — small weighing
    // differences shouldn't move money.
    finalPrice: withinTolerance ? pickup.price : proposedPrice,
  };
}

async function creditEarning(pickup) {
  try {
    await Transaction.create({
      collector: pickup.collector,
      pickup: pickup._id,
      type: "earning",
      amount: pickup.price,
    });
  } catch (err) {
    // Unique (pickup, type) index: a duplicate is a retry, not an error.
    if (err.code !== 11000) throw err;
  }
}

// The single place a held settlement becomes real money. Atomic on the
// current settlement status, so a requester confirm, the auto-confirm job
// and an admin resolution racing each other can only ever finalize once.
async function finalizeSettlement(io, pickupId, { finalPrice, status, from = ["pending_confirmation"] }) {
  const pickup = await Pickup.findOneAndUpdate(
    { _id: pickupId, "settlement.status": { $in: from } },
    { $set: { "settlement.status": status, "settlement.finalPrice": finalPrice, "settlement.resolvedAt": new Date(), price: finalPrice } },
    { new: true }
  );
  if (!pickup) return null;

  await creditEarning(pickup);
  io.emit("updatePickup", pickup);

  await notifyUser(io, pickup.collector, {
    type: "status_update",
    text: `Weight settled for your ${pickup.scrapType} pickup — ₹${finalPrice} added to your wallet.`,
    pickupId: pickup._id,
  });
  return pickup;
}

module.exports = {
  computeSettlement,
  creditEarning,
  finalizeSettlement,
  SETTLEMENT_TOLERANCE_PCT,
  SETTLEMENT_CONFIRM_HOURS,
};