const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { estimatePrice } = require("../utils/pricing");
const notifyUser = require("../utils/notifyUser");

const STATUS_LABELS = {
  accepted: "accepted",
  in_progress: "started",
  completed: "completed",
  cancelled: "cancelled",
};

const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

// POST /api/pickup/request
exports.createPickup = asyncHandler(async (req, res) => {
  const { scrapType, estimatedWeightKg, lat, lng, address } = req.body;

  const pickup = await Pickup.create({
    user: req.user.id,
    scrapType,
    estimatedWeightKg,
    image: req.file?.path || req.file?.secure_url || null,
    location: { lat, lng, address },
    price: estimatePrice(scrapType, estimatedWeightKg),
    statusHistory: [{ status: "pending", changedBy: req.user.id }],
  });

  req.io.emit("newPickup", pickup);
  res.status(201).json(pickup);
});

// GET /api/pickup/my-requests
exports.getMyRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const [data, total] = await Promise.all([
    Pickup.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("collector", "name phone rating"),
    Pickup.countDocuments({ user: req.user.id }),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/pickup/available  (collector only)
// Pass ?lat=&lng= to get pickups sorted by real distance (nearest first),
// optionally bounded by ?radiusKm=. Without coordinates, falls back to the
// original newest-first behavior — old clients/tests keep working.
exports.getAvailable = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // Deleting/deactivating an account cancels that person's own *open*
  // pickup requests (see authController.deleteAccount), but this is a
  // second line of defense — e.g. for rows that predate that fix, or an
  // admin deactivation — so a request tied to an account nobody can reach
  // never lingers in the feed collectors see.
  const activeRequesterIds = await User.find({ isActive: true }).distinct("_id");

  if (!hasCoords) {
    const filter = { status: "pending", user: { $in: activeRequesterIds } };
    const [data, total] = await Promise.all([
      Pickup.find(filter)
        .sort({ isUrgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name phone"),
      Pickup.countDocuments(filter),
    ]);

    return res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  const radiusKm = Math.min(100, Math.max(1, parseFloat(req.query.radiusKm) || 25));

  // $geoNear must be the first stage in the pipeline and requires the
  // 2dsphere index defined on Pickup.geo. It computes distanceField for us
  // in the same query — no separate pass to calculate distance in JS.
  const basePipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        query: { status: "pending", user: { $in: activeRequesterIds } },
        spherical: true,
      },
    },
  ];

  const [data, totalResult] = await Promise.all([
    Pickup.aggregate([
      ...basePipeline,
      // $geoNear's implicit sort is by distance — re-sort urgent-first while
      // keeping distance as the tiebreaker within each group.
      { $sort: { isUrgent: -1, distanceMeters: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, phone: 1 } }],
        },
      },
      { $unwind: "$user" },
      { $addFields: { distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] } } },
    ]),
    Pickup.aggregate([...basePipeline, { $count: "total" }]),
  ]);

  const total = totalResult[0]?.total || 0;
  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/pickup/collector/jobs  (collector's accepted/active/completed jobs)
exports.getCollectorJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { collector: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Pickup.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name phone"),
    Pickup.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/pickup/:id/accept  (collector only)
exports.acceptPickup = asyncHandler(async (req, res) => {
  const collectorUser = await User.findById(req.user.id);
  if (collectorUser?.collectorSuspended) {
    throw new ApiError(
      403,
      "Your account is suspended from accepting new pickups due to low ratings. Contact support."
    );
  }

  // Atomic find-and-update, scoped to status: "pending" in the filter itself
  // — not a separate read-then-write. Two collectors tapping "Accept" on the
  // same pickup at the same moment can no longer both pass a status check
  // and then both save; only one findOneAndUpdate can match and flip the
  // status in a single atomic op, so the loser reliably gets null back
  // instead of silently overwriting the winner's collector assignment.
  const pickup = await Pickup.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    {
      $set: { collector: req.user.id, status: "accepted" },
      $push: { statusHistory: { status: "accepted", changedBy: req.user.id } },
    },
    { new: true }
  );

  if (!pickup) {
    const exists = await Pickup.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? "Pickup is no longer available" : "Pickup not found");
  }

  await pickup.populate("collector", "name");

  req.io.emit("updatePickup", pickup);

  await notifyUser(req.io, pickup.user, {
    type: "pickup_accepted",
    text: `${pickup.collector.name} accepted your ${pickup.scrapType} pickup request`,
    pickupId: pickup._id,
  });

  res.json(pickup);
});

// PATCH /api/pickup/:id/cancel  (requester only, must own the request)
exports.cancelByRequester = asyncHandler(async (req, res) => {
  // Atomic, scoped by both ownership and current status in the filter
  // itself — matching acceptPickup's pattern below rather than a separate
  // read-then-write. Without this, a double-tap or retried "Cancel" request
  // could both read a still-cancellable status and both push a duplicate
  // "cancelled" history entry (and, worse, both fire the collector
  // notification below a second time) before either write lands.
  const pickup = await Pickup.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, status: { $in: ["pending", "accepted"] } },
    { $set: { status: "cancelled" }, $push: { statusHistory: { status: "cancelled", changedBy: req.user.id } } },
    { new: true }
  );

  if (!pickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (String(existing.user) !== String(req.user.id)) {
      throw new ApiError(403, "This isn't your pickup request");
    }
    // Once a collector is en route (in_progress) it's too late to cancel
    // from the app — real-world coordination should happen via chat/phone
    // instead.
    throw new ApiError(400, `Can't cancel a pickup that's already ${existing.status}`);
  }

  req.io.emit("updatePickup", pickup);

  if (pickup.collector) {
    await notifyUser(req.io, pickup.collector, {
      type: "status_update",
      text: `The ${pickup.scrapType} pickup you accepted was cancelled by the requester`,
      pickupId: pickup._id,
    });
  }

  res.json(pickup);
});

// Reverse lookup for updateStatus below: which current status(es) a pickup
// must be in for a given target status to be a legal transition. Built this
// way (rather than the more natural fromStatus -> allowed toStatuses map)
// specifically so it can be used as a MongoDB $in filter directly in the
// atomic update — see the comment there for why that matters.
const VALID_FROM_STATUSES = {
  in_progress: ["accepted"],
  cancelled: ["accepted", "in_progress"],
  completed: ["in_progress"],
};

exports.updateStatus = asyncHandler(async (req, res) => {
  const nextStatus = req.body.status;
  const validFrom = VALID_FROM_STATUSES[nextStatus] || [];

  // Atomic, scoped by both collector ownership and current status in the
  // filter itself — not a separate read-then-write (see acceptPickup's
  // comment for the same pattern and the race it closes). Without this, two
  // near-simultaneous requests to mark the same pickup "completed" — a
  // realistic double-tap, or a client retrying after a slow/dropped
  // response — could both read status "in_progress", both pass validation,
  // and both push a duplicate history entry. The unique index on
  // Transaction(pickup, type) already prevented double-crediting the
  // earning itself, but the pickup's own status/history update had no
  // equivalent protection until now.
  const pickup =
    validFrom.length > 0
      ? await Pickup.findOneAndUpdate(
          { _id: req.params.id, collector: req.user.id, status: { $in: validFrom } },
          {
            $set: { status: nextStatus },
            $push: { statusHistory: { status: nextStatus, changedBy: req.user.id } },
          },
          { new: true }
        )
      : null;

  if (!pickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (String(existing.collector) !== String(req.user.id)) {
      throw new ApiError(403, "You are not assigned to this pickup");
    }
    throw new ApiError(400, `Cannot move from ${existing.status} to ${nextStatus}`);
  }

  if (nextStatus === "completed") {
    try {
      await Transaction.create({
        collector: pickup.collector,
        pickup: pickup._id,
        type: "earning",
        amount: pickup.price,
      });
    } catch (err) {
      // Unique index on (pickup, type) means a duplicate here is a retried
      // request for a pickup already credited — not a real error, so the
      // pickup status update above still stands. Anything else, surface it.
      if (err.code !== 11000) throw err;
    }
  }

  req.io.emit("updatePickup", pickup);

  await notifyUser(req.io, pickup.user, {
    type: "status_update",
    text: `Your ${pickup.scrapType} pickup was ${STATUS_LABELS[nextStatus] || nextStatus}`,
    pickupId: pickup._id,
  });

  res.json(pickup);
});