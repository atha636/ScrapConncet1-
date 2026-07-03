const Pickup = require("../models/Pickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { estimatePrice } = require("../utils/pricing");

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
exports.getAvailable = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const [data, total] = await Promise.all([
    Pickup.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name phone"),
    Pickup.countDocuments({ status: "pending" }),
  ]);

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
  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");
  if (pickup.status !== "pending") throw new ApiError(409, "Pickup is no longer available");

  pickup.collector = req.user.id;
  pickup.pushHistory("accepted", req.user.id);
  await pickup.save();

  req.io.emit("updatePickup", pickup);
  res.json(pickup);
});

// PATCH /api/pickup/:id/status  (collector only, must own the job)
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

  req.io.emit("updatePickup", pickup);
  res.json(pickup);
});
