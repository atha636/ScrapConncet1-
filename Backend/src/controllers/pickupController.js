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

  if (!hasCoords) {
    const [data, total] = await Promise.all([
      Pickup.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name phone"),
      Pickup.countDocuments({ status: "pending" }),
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
        query: { status: "pending" },
        spherical: true,
      },
    },
  ];

  const [data, totalResult] = await Promise.all([
    Pickup.aggregate([
      ...basePipeline,
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

  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");
  if (pickup.status !== "pending") throw new ApiError(409, "Pickup is no longer available");

  pickup.collector = req.user.id;
  pickup.pushHistory("accepted", req.user.id);
  await pickup.save();
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
  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  if (String(pickup.user) !== String(req.user.id)) {
    throw new ApiError(403, "This isn't your pickup request");
  }

  // Once a collector is en route (in_progress) it's too late to cancel from
  // the app — real-world coordination should happen via chat/phone instead.
  if (!["pending", "accepted"].includes(pickup.status)) {
    throw new ApiError(400, `Can't cancel a pickup that's already ${pickup.status}`);
  }

  const hadCollector = pickup.collector;
  pickup.pushHistory("cancelled", req.user.id);
  await pickup.save();

  req.io.emit("updatePickup", pickup);

  if (hadCollector) {
    await notifyUser(req.io, hadCollector, {
      type: "status_update",
      text: `The ${pickup.scrapType} pickup you accepted was cancelled by the requester`,
      pickupId: pickup._id,
    });
  }

  res.json(pickup);
});
exports.updateStatus = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  if (String(pickup.collector) !== String(req.user.id)) {
    throw new ApiError(403, "You are not assigned to this pickup");
  }

  const validTransitions = {
    accepted: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
  };
  const allowed = validTransitions[pickup.status] || [];
  if (!allowed.includes(req.body.status)) {
    throw new ApiError(400, `Cannot move from ${pickup.status} to ${req.body.status}`);
  }

  pickup.pushHistory(req.body.status, req.user.id);
  await pickup.save();

  if (req.body.status === "completed") {
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
    text: `Your ${pickup.scrapType} pickup was ${STATUS_LABELS[req.body.status] || req.body.status}`,
    pickupId: pickup._id,
  });

  res.json(pickup);
});