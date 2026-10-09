const mongoose = require("mongoose");
const Pickup = require("../models/Pickup");
const RecyclingPartner = require("../models/RecyclingPartner");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");

const MAX_PICKUPS_PER_DROP = 30;

const typesOf = (pickup) =>
  (pickup.items && pickup.items.length > 0 ? pickup.items : [{ scrapType: pickup.scrapType }]).map((i) => i.scrapType);

// GET /api/dropoffs/pending  (collector)
// Completed pickups this collector hasn't yet delivered to a partner.
exports.getPendingDropOffs = asyncHandler(async (req, res) => {
  const pickups = await Pickup.find({ collector: req.user.id, status: "completed", "dropOff.at": null })
    .select("items scrapType estimatedWeightKg settlement.actualItems location.address updatedAt")
    .sort({ updatedAt: -1 })
    .limit(100);

  res.json({
    pickups: pickups.map((p) => {
      const actual = p.settlement?.actualItems || [];
      const items = p.items && p.items.length > 0 ? p.items : [{ scrapType: p.scrapType, estimatedWeightKg: p.estimatedWeightKg }];
      return {
        id: p._id,
        address: p.location?.address || null,
        completedAt: p.updatedAt,
        lines: items.map((it, i) => ({
          scrapType: it.scrapType,
          kg: actual[i]?.actualWeightKg ?? it.estimatedWeightKg ?? null,
        })),
      };
    }),
  });
});

// POST /api/dropoffs  (collector) — multipart: partnerId, pickupIds (JSON array), photo
//
// One photo and one partner can cover several pickups, since a collector
// usually delivers a mixed load from a round of collections. Either every
// pickup in the request is recorded or none is.
exports.recordDropOff = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Add a photo of the delivery at the recycling partner");

  let ids;
  try {
    ids = JSON.parse(req.body.pickupIds);
  } catch {
    throw new ApiError(400, "pickupIds must be a list");
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_PICKUPS_PER_DROP || !ids.every((i) => mongoose.isValidObjectId(i))) {
    throw new ApiError(400, `Choose between 1 and ${MAX_PICKUPS_PER_DROP} pickups`);
  }
  if (!mongoose.isValidObjectId(req.body.partnerId)) throw new ApiError(400, "Choose a recycling partner");

  const partner = await RecyclingPartner.findOne({ _id: req.body.partnerId, isActive: true });
  if (!partner) throw new ApiError(400, "That recycling partner isn't available");

  const pickups = await Pickup.find({
    _id: { $in: ids },
    collector: req.user.id,
    status: "completed",
    "dropOff.at": null,
  });
  if (pickups.length !== new Set(ids).size) {
    throw new ApiError(400, "Some of these pickups aren't yours, aren't completed, or were already delivered");
  }

  if (partner.accepts.length > 0) {
    const unsupported = new Set(pickups.flatMap(typesOf).filter((t) => !partner.accepts.includes(t)));
    if (unsupported.size > 0) {
      throw new ApiError(400, `${partner.name} doesn't accept: ${[...unsupported].join(", ")}`);
    }
  }

  const at = new Date();
  const photo = req.file.path || req.file.secure_url;
  await Pickup.updateMany(
    { _id: { $in: pickups.map((p) => p._id) } },
    { $set: { dropOff: { partner: partner._id, partnerName: partner.name, partnerCity: partner.city, photo, at } } }
  );

  // Tell each requester once, even if they had several pickups in this drop.
  for (const userId of new Set(pickups.map((p) => String(p.user)))) {
    await notifyUser(req.io, userId, {
      type: "recycling_update",
      text: `Your scrap was delivered to ${partner.name} (${partner.city}) for recycling.`,
    });
  }

  res.json({ recorded: pickups.length, partner: { name: partner.name, city: partner.city } });
});