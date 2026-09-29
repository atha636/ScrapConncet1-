const RecurringPickup = require("../models/RecurringPickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { computeNextRun, firstRunOnOrAfter } = require("../utils/recurrence");

// Shared by every handler that acts on one template — same 404-then-403
// order the original handlers used, so a requester can't probe which ids
// exist by comparing error codes.
async function loadOwnedTemplate(req) {
  const recurring = await RecurringPickup.findById(req.params.id);
  if (!recurring) throw new ApiError(404, "Recurring pickup not found");
  if (String(recurring.user) !== String(req.user.id)) {
    throw new ApiError(403, "This isn't your recurring pickup");
  }
  return recurring;
}

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
  // Either direction ends any dated pause: pausing open-endedly replaces
  // it, and resuming means the requester wants it running now, not "until
  // the 20th."
  recurring.pausedUntil = null;
  // Resuming a long-paused series shouldn't immediately fire a backlog of
  // "overdue" spawns for every interval that passed while it was paused —
  // re-anchor the schedule to start counting from the moment it's resumed.
  if (recurring.active) {
    recurring.nextRunAt = computeNextRun(recurring.frequency);
  }
  await recurring.save();

  res.json(recurring);
});

// PATCH /api/pickup/recurring/:id/skip
//
// Skips just the next occurrence and keeps the series running — the gap
// between "pause the whole thing" and "cancel it" that most recurring
// schedules eventually need ("I've got nothing to collect this week").
// Advances from the stored nextRunAt, not from now, for the same reason
// the spawn job does: it keeps the series on its original cadence.
exports.skipNextRecurring = asyncHandler(async (req, res) => {
  const recurring = await loadOwnedTemplate(req);
  if (!recurring.active) {
    throw new ApiError(400, "This repeat pickup is paused — resume it first, or just leave it paused");
  }

  recurring.skippedRunAt = recurring.nextRunAt;
  recurring.nextRunAt = computeNextRun(recurring.frequency, recurring.nextRunAt);
  await recurring.save();

  res.json(recurring);
});

// PATCH /api/pickup/recurring/:id/pause   { until: ISO date | null }
//
// A dated pause: skips every occurrence up to `until` and resumes on the
// series' own rhythm afterwards, with no need to remember to switch it
// back on. `until: null` resumes early.
exports.pauseRecurring = asyncHandler(async (req, res) => {
  const recurring = await loadOwnedTemplate(req);
  const { until } = req.body;

  if (until === null) {
    // Resuming early can't restore a schedule position that's been jumped
    // past, so it re-anchors from now — same rule as the plain toggle.
    recurring.pausedUntil = null;
    recurring.active = true;
    recurring.nextRunAt = computeNextRun(recurring.frequency);
  } else {
    recurring.active = true;
    recurring.pausedUntil = until;
    recurring.nextRunAt = firstRunOnOrAfter(recurring.frequency, recurring.nextRunAt, until);
  }
  await recurring.save();

  res.json(recurring);
});

// PATCH /api/pickup/recurring/:id
//
// Edits a template in place, so changing how often (or how much, or which
// phone number) doesn't mean cancelling it and setting a new one up.
exports.updateRecurring = asyncHandler(async (req, res) => {
  const recurring = await loadOwnedTemplate(req);
  const { frequency, estimatedWeightKg, contactName, contactPhone } = req.body;

  if (estimatedWeightKg !== undefined) recurring.estimatedWeightKg = estimatedWeightKg;
  if (contactName !== undefined) recurring.contactName = contactName;
  if (contactPhone !== undefined) recurring.contactPhone = contactPhone;

  if (frequency !== undefined && frequency !== recurring.frequency) {
    recurring.frequency = frequency;
    // Re-anchor to the last real occurrence under the new cadence, so
    // "weekly" -> "biweekly" lands two weeks after the last pickup rather
    // than two weeks from today. If that's already in the past (the last
    // pickup was long ago), count from now instead of spawning immediately.
    const base = recurring.lastPickupCreatedAt || recurring.createdAt;
    let next = computeNextRun(frequency, base);
    if (next <= new Date()) next = computeNextRun(frequency);
    // A dated pause still wins over a frequency change.
    if (recurring.pausedUntil && recurring.pausedUntil > new Date()) {
      next = firstRunOnOrAfter(frequency, next, recurring.pausedUntil);
    }
    recurring.nextRunAt = next;
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