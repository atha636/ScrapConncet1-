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

  // Recompute the target user's running average rather than storing a full
  // history read — cheap to update incrementally on every new rating.
  const target = await User.findById(toUser);
  const newCount = target.ratingCount + 1;
  const newAverage = (target.rating * target.ratingCount + rating.score) / newCount;
  target.rating = Math.round(newAverage * 10) / 10;
  target.ratingCount = newCount;

  if (
    target.role === "collector" &&
    !target.collectorSuspended &&
    newCount >= MIN_RATINGS_FOR_GATE &&
    target.rating < SUSPENSION_THRESHOLD
  ) {
    target.collectorSuspended = true;
    target.collectorSuspendedAt = new Date();
  }

  await target.save();

  res.status(201).json(rating);
});