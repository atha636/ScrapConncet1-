const Rating = require("../models/Rating");
const Pickup = require("../models/Pickup");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { MIN_RATINGS_FOR_GATE, SUSPENSION_THRESHOLD } = require("../utils/ratingGate");

// GET /api/pickup/:id/rating
// Returns whatever ratings already exist for this pickup — lets the
// frontend know if the current user has already rated (so it can hide the
// form) without a separate "have I rated" endpoint.
exports.getRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find({ pickup: req.params.id }).populate("fromUser", "name");
  res.json(ratings);
});

// POST /api/pickup/:id/rating
exports.submitRating = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  if (pickup.status !== "completed") {
    throw new ApiError(400, "You can only rate a pickup after it's completed");
  }

  const isRequester = String(pickup.user) === String(req.user.id);
  const isCollector = String(pickup.collector) === String(req.user.id);
  if (!isRequester && !isCollector) {
    throw new ApiError(403, "You weren't part of this pickup");
  }

  const toUser = isRequester ? pickup.collector : pickup.user;

  const existing = await Rating.findOne({ pickup: pickup._id, fromUser: req.user.id });
  if (existing) throw new ApiError(409, "You've already rated this pickup");

  const rating = await Rating.create({
    pickup: pickup._id,
    fromUser: req.user.id,
    toUser,
    score: req.body.score,
    comment: req.body.comment,
  });

  // Recompute the target user's average/count from the Rating collection
  // itself, rather than the previous read-modify-write on the User document
  const [agg] = await Rating.aggregate([
    { $match: { toUser: target._id } },
    { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
  ]);

  const newCount = agg?.count || 0;
  const newAverage = agg ? Math.round(agg.avg * 10) / 10 : 0;

  const update = { rating: newAverage, ratingCount: newCount };

  if (
    target.role === "collector" &&
    !target.collectorSuspended &&
    newCount >= MIN_RATINGS_FOR_GATE &&
    newAverage < SUSPENSION_THRESHOLD
  ) {
    update.collectorSuspended = true;
    update.collectorSuspendedAt = new Date();
  }

  await User.findByIdAndUpdate(toUser, { $set: update });

  res.status(201).json(rating);
});