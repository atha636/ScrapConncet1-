const RecurringPickup = require("../models/RecurringPickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { computeNextRun } = require("../utils/recurrence");

// POST /api/pickup/recurring
// Sets up a template — the very first occurrence is whatever one-time
// pickup the requester just submitted through the normal request form;
// this only governs every occurrence *after* that, so nextRunAt starts one
// full interval out rather than immediately spawning a duplicate.
exports.createRecurring = asyncHandler(async (req, res) => {
  const { scrapType, estimatedWeightKg, contactName, contactPhone, lat, lng, address, frequency } = req.body;

  const recurring = await RecurringPickup.create({
    user: req.user.id,
    scrapType,
    estimatedWeightKg,
    contactName,
    contactPhone,
    location: { lat, lng, address },
    frequency,
    nextRunAt: computeNextRun(frequency),
  });

  res.status(201).json(recurring);
});

// GET /api/pickup/recurring
exports.getMyRecurring = asyncHandler(async (req, res) => {
  const recurring = await RecurringPickup.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(recurring);
});

// PATCH /api/pickup/recurring/:id/toggle
exports.toggleRecurring = asyncHandler(async (req, res) => {
  const recurring = await RecurringPickup.findById(req.params.id);
  if (!recurring) throw new ApiError(404, "Recurring pickup not found");
  if (String(recurring.user) !== String(req.user.id)) {
    throw new ApiError(403, "This isn't your recurring pickup");
  }

  recurring.active = !recurring.active;
  // Resuming a long-paused series shouldn't immediately fire a backlog of
  // "overdue" spawns for every interval that passed while it was paused —
  // re-anchor the schedule to start counting from the moment it's resumed.
  if (recurring.active) {
    recurring.nextRunAt = computeNextRun(recurring.frequency);
  }
  await recurring.save();

  res.json(recurring);
});

// DELETE /api/pickup/recurring/:id
exports.deleteRecurring = asyncHandler(async (req, res) => {
  const recurring = await RecurringPickup.findById(req.params.id);
  if (!recurring) throw new ApiError(404, "Recurring pickup not found");
  if (String(recurring.user) !== String(req.user.id)) {
    throw new ApiError(403, "This isn't your recurring pickup");
  }

  await recurring.deleteOne();
  res.json({ success: true });
});