const Pickup = require("../models/Pickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Settlement states where the price on the receipt is the real, final one.
// "none" is a pickup that completed without a weight-based adjustment.
const FINAL_SETTLEMENT = new Set(["none", "auto_confirmed", "confirmed", "resolved"]);

// Same shape settlement uses: the line items, or a single line for an
// old-style pickup that only has scrapType/estimatedWeightKg.
const itemsOf = (pickup) =>
  pickup.items && pickup.items.length > 0
    ? pickup.items
    : [{ scrapType: pickup.scrapType, estimatedWeightKg: pickup.estimatedWeightKg }];

const when = (history, status) => history?.find((h) => h.status === status)?.changedAt || null;

// GET /api/pickup/:id/receipt  (the requester or the collector only)
//
// A read-only summary of a completed pickup: what was expected, what was
// actually weighed, the price, the proof photos and who/when. Phone numbers
// are deliberately left out — both parties already have a chat for contact.
exports.getReceipt = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id)
    .populate("user", "name")
    .populate("collector", "name rating ratingCount");
  if (!pickup) throw new ApiError(404, "Pickup not found");

  const userId = String(pickup.user?._id || pickup.user);
  const collectorId = pickup.collector ? String(pickup.collector._id || pickup.collector) : null;
  if (req.user.id !== userId && req.user.id !== collectorId) {
    throw new ApiError(403, "You can only view receipts for your own pickups");
  }
  if (pickup.status !== "completed") throw new ApiError(409, "A receipt is available once the pickup is completed");

  const s = pickup.settlement || {};
  const actual = s.actualItems || [];
  const lines = itemsOf(pickup).map((item, i) => ({
    scrapType: item.scrapType,
    estimatedKg: item.estimatedWeightKg ?? null,
    actualKg: actual[i]?.actualWeightKg ?? null,
  }));

  const status = s.status || "none";
  const agreedPrice = s.originalPrice ?? pickup.price;
  // While a weight change is still waiting on the requester (or disputed),
  // the amount isn't final — show what's proposed, and say so.
  const finalPrice = FINAL_SETTLEMENT.has(status) ? (s.finalPrice ?? pickup.price) : null;

  const completedAt = when(pickup.statusHistory, "completed") || pickup.updatedAt;
  const ym = new Date(completedAt).toISOString().slice(0, 7).replace("-", "");

  res.json({
    receiptNo: `SCR-${ym}-${String(pickup._id).slice(-6).toUpperCase()}`,
    pickupId: pickup._id,
    isFinal: finalPrice !== null,
    settlementStatus: status,
    requester: pickup.user?.name || null,
    collector: pickup.collector
      ? { name: pickup.collector.name, rating: pickup.collector.rating, ratingCount: pickup.collector.ratingCount }
      : null,
    address: pickup.location?.address || null,
    lines,
    agreedPrice,
    proposedPrice: finalPrice === null ? s.proposedPrice ?? null : null,
    finalPrice,
    timeline: {
      requested: pickup.createdAt,
      accepted: when(pickup.statusHistory, "accepted"),
      started: when(pickup.statusHistory, "in_progress"),
      completed: completedAt,
    },
    photos: { completion: pickup.completionPhoto || null, weighing: pickup.weighPhoto || null },
  });
});