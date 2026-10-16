const mongoose = require("mongoose");
const Pickup = require("../models/Pickup");
const User = require("../models/User");
const Dispute = require("../models/Dispute");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { actorFilter, isActor } = require("../utils/teamAccess");
const { buildUpiUri } = require("../utils/upi");

// Settlement states where the price is final and money can change hands.
const PAYABLE_SETTLEMENT = ["none", "auto_confirmed", "confirmed", "resolved"];


const loadPickup = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Pickup not found");
  const pickup = await Pickup.findById(id);
  if (!pickup) throw new ApiError(404, "Pickup not found");
  return pickup;
};

const isPayable = (pickup) =>
  pickup.status === "completed" && PAYABLE_SETTLEMENT.includes(pickup.settlement?.status || "none");

const stateOf = (pickup) => ({
  status: pickup.payment?.status || "unpaid",
  method: pickup.payment?.method || null,
  amount: pickup.payment?.amount ?? pickup.price,
  upiRef: pickup.payment?.upiRef || null,
  claimedAt: pickup.payment?.claimedAt || null,
  confirmedAt: pickup.payment?.confirmedAt || null,
});

const notifyCollectorSide = async (io, pickup, text) => {
  const ids = new Set([String(pickup.collector)]);
  if (pickup.assignedTo) ids.add(String(pickup.assignedTo));
  await Promise.all([...ids].map((id) => notifyUser(io, id, { type: "status_update", text, pickupId: pickup._id })));
};

/* --------------------------- requester's UPI ID --------------------------- */

// GET /api/payments/upi-id  (requester)
exports.getMyUpi = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+upiId");
  res.json({ upiId: user?.upiId || "" });
});

// PUT /api/payments/upi-id  (requester)
exports.saveMyUpi = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+upiId");
  if (!user) throw new ApiError(404, "User not found");
  user.upiId = req.body.upiId;
  await user.save();
  res.json({ upiId: user.upiId });
});

// DELETE /api/payments/upi-id
exports.clearMyUpi = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $unset: { upiId: 1 } });
  res.json({ upiId: "" });
});

/* ------------------------------ pickup payment ----------------------------- */

// GET /api/payments/pickups/:id  (requester or the collector side)
// The requester's UPI ID is only ever included for the collector side, and
// only while there is something left to pay.
exports.getPayment = asyncHandler(async (req, res) => {
  const pickup = await loadPickup(req.params.id);
  const isRequester = String(pickup.user) === String(req.user.id);
  const isCollectorSide = isActor(pickup, req.user.id);
  if (!isRequester && !isCollectorSide) throw new ApiError(403, "This isn't your pickup");

  const base = { ...stateOf(pickup), payable: isPayable(pickup) };
  if (!isCollectorSide) {
    const me = await User.findById(req.user.id).select("+upiId");
    return res.json({ ...base, role: "requester", hasUpi: !!me?.upiId });
  }

  let upi = null;
  let requesterHasUpi = false;
  if (base.payable && ["unpaid", "claimed"].includes(base.status)) {
    const requester = await User.findById(pickup.user).select("name +upiId");
    requesterHasUpi = !!requester?.upiId;
    if (requesterHasUpi) {
      upi = {
        upiId: requester.upiId,
        payeeName: requester.name,
        uri: buildUpiUri({
          upiId: requester.upiId,
          name: requester.name,
          amount: pickup.price,
          note: "ScrapConnect pickup",
        }),
      };
    }
  }
  res.json({ ...base, amount: pickup.payment?.amount ?? pickup.price, role: "collector", requesterHasUpi, upi });
});

// POST /api/payments/pickups/:id/claim  (collector side) — "I've paid"
exports.claimPaid = asyncHandler(async (req, res) => {
  const { method, upiRef } = req.body;
  const pickup = await loadPickup(req.params.id);
  if (!isActor(pickup, req.user.id)) throw new ApiError(403, "Only the collector on this pickup can do that");
  if (!isPayable(pickup)) throw new ApiError(400, "Payment opens once the pickup is completed and the final amount is settled");
  if (pickup.payment?.status === "claimed") return res.json(stateOf(pickup));

  const updated = await Pickup.findOneAndUpdate(
    { _id: pickup._id, ...actorFilter(req.user.id), "payment.status": { $in: [null, "unpaid"] } },
    {
      $set: {
        "payment.status": "claimed",
        "payment.method": method,
        "payment.amount": pickup.price,
        "payment.upiRef": method === "upi" && upiRef ? upiRef : null,
        "payment.claimedAt": new Date(),
      },
    },
    { new: true }
  );
  if (!updated) throw new ApiError(409, "This payment was already recorded");

  await notifyUser(req.io, updated.user, {
    type: "status_update",
    text: `Your collector says they paid ₹${updated.price} by ${method === "upi" ? "UPI" : "cash"} for your ${updated.scrapType} pickup. Please confirm once you've received it.`,
    pickupId: updated._id,
  });
  req.io.emit("updatePickup", updated);
  res.json(stateOf(updated));
});

// POST /api/payments/pickups/:id/confirm  (requester) — "Received"
exports.confirmReceived = asyncHandler(async (req, res) => {
  const updated = await Pickup.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, "payment.status": "claimed" },
    { $set: { "payment.status": "confirmed", "payment.confirmedAt": new Date() } },
    { new: true }
  );
  if (!updated) {
    const existing = await loadPickup(req.params.id);
    if (String(existing.user) !== String(req.user.id)) throw new ApiError(403, "This isn't your pickup");
    if (existing.payment?.status === "confirmed") return res.json(stateOf(existing));
    throw new ApiError(400, "There's no payment waiting for your confirmation");
  }

  await notifyCollectorSide(req.io, updated, `The requester confirmed they received ₹${updated.payment.amount} for your ${updated.scrapType} pickup. All settled.`);
  req.io.emit("updatePickup", updated);
  res.json(stateOf(updated));
});

// POST /api/payments/pickups/:id/dispute  (requester) — "Not received"
exports.disputePayment = asyncHandler(async (req, res) => {
  const updated = await Pickup.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, "payment.status": "claimed" },
    { $set: { "payment.status": "disputed" } },
    { new: true }
  );
  if (!updated) throw new ApiError(400, "There's no payment you can dispute on this pickup");

  const ref = updated.payment.upiRef ? ` UPI ref: ${updated.payment.upiRef}.` : "";
  try {
    await Dispute.create({
      pickup: updated._id,
      reportedBy: req.user.id,
      reportedAgainst: updated.collector,
      reason: "payment_issue",
      description: `Collector marked ₹${updated.payment.amount} as paid by ${updated.payment.method}, requester says it wasn't received.${ref} ${req.body.description || ""}`.trim(),
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }

  await notifyCollectorSide(req.io, updated, `The requester says they haven't received ₹${updated.payment.amount} for your ${updated.scrapType} pickup. An admin will review it.`);
  req.io.emit("updatePickup", updated);
  res.json(stateOf(updated));
});