const Pickup = require("../models/Pickup");
const Dispute = require("../models/Dispute");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const paginate = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// POST /api/pickup/:id/dispute  (requester or the assigned collector)
// A dispute only makes sense once a collector is actually involved — a
// still-"pending" pickup has no second party to report, or to be reported
// by. Anything from "accepted" onward is fair game, including "cancelled":
// a collector who accepted and then never showed leaves the pickup exactly
// there, and that's the single most common reason to file one.
exports.createDispute = asyncHandler(async (req, res) => {
  const { reason, description } = req.body;

  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  if (pickup.status === "pending" || !pickup.collector) {
    throw new ApiError(400, "A dispute can only be filed once a collector is involved");
  }

  const isRequester = String(pickup.user) === String(req.user.id);
  const isCollector = String(pickup.collector) === String(req.user.id);
  if (!isRequester && !isCollector) {
    throw new ApiError(403, "You weren't a party to this pickup");
  }

  const reportedAgainst = isRequester ? pickup.collector : pickup.user;

  let dispute;
  try {
    dispute = await Dispute.create({
      pickup: pickup._id,
      reportedBy: req.user.id,
      reportedAgainst,
      reason,
      description,
    });
  } catch (err) {
    // The partial unique index (pickup + reportedBy, status: "open") is
    // what actually prevents a duplicate — this just turns Mongo's raw
    // E11000 into a message that makes sense to the person who hit it.
    if (err.code === 11000) {
      throw new ApiError(409, "You already have an open report for this pickup");
    }
    throw err;
  }

  res.status(201).json(dispute);
});

// GET /api/admin/disputes
exports.getDisputes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reportedBy", "name email role")
      .populate("reportedAgainst", "name email role")
      .populate("resolvedBy", "name")
      .populate("pickup", "scrapType price status createdAt"),
    Dispute.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/admin/disputes/:id/resolve
exports.resolveDispute = asyncHandler(async (req, res) => {
  const { status, resolutionNotes } = req.body;

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, "Dispute not found");
  if (dispute.status !== "open") {
    throw new ApiError(400, `This dispute was already ${dispute.status}`);
  }

  dispute.status = status;
  dispute.resolutionNotes = resolutionNotes;
  dispute.resolvedBy = req.user.id;
  dispute.resolvedAt = new Date();
  await dispute.save();

  res.json(dispute);
});