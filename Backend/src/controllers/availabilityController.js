const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { isCollectorAvailableNow } = require("../utils/collectorAvailability");

const AVAILABILITY_FIELDS = "collectorPaused availabilitySchedule";

function serializeAvailability(user) {
  return {
    paused: user.collectorPaused,
    scheduleEnabled: user.availabilitySchedule?.enabled || false,
    schedule: user.availabilitySchedule?.schedule || [],
    // Computed server-side (see collectorAvailability.js) rather than
    // left for the frontend to derive from the raw fields above — the
    // Asia/Kolkata "what time is it right now" logic only needs to exist
    // in one place, and the frontend showing a banner just needs the
    // answer, not the ability to recompute it.
    isAvailableNow: isCollectorAvailableNow(user),
  };
}

// GET /api/pickup/collector/availability  (collector only, self only)
exports.getMyAvailability = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(AVAILABILITY_FIELDS);
  res.json(serializeAvailability(user));
});

// PATCH /api/pickup/collector/availability  (collector only, self only)
//
// Every field is optional and only touches what's actually sent — a
// collector flipping the pause toggle from the Dashboard shouldn't
// accidentally wipe a schedule they set up separately on a settings page,
// and vice versa.
exports.updateMyAvailability = asyncHandler(async (req, res) => {
  const { paused, scheduleEnabled, schedule } = req.body;
  const update = {};
  if (paused !== undefined) update.collectorPaused = paused;
  if (scheduleEnabled !== undefined) update["availabilitySchedule.enabled"] = scheduleEnabled;
  if (schedule !== undefined) update["availabilitySchedule.schedule"] = schedule;

  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select(
    AVAILABILITY_FIELDS
  );

  res.json(serializeAvailability(user));
});