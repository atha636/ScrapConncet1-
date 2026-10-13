const ApiError = require("./ApiError");

const MIN_WINDOW_MIN = 30;
const MAX_WINDOW_HOURS = 6;
const MAX_DAYS_AHEAD = 7;

// Validates a preferred pickup window sent as two ISO timestamps. Returns
// { start, end } or null when no window was asked for (as soon as possible).
function parseSlot(slotStart, slotEnd, now = new Date()) {
  if (!slotStart && !slotEnd) return null;
  if (!slotStart || !slotEnd) throw new ApiError(400, "Choose both a start and an end for the pickup window");

  const start = new Date(slotStart);
  const end = new Date(slotEnd);
  const minutes = (end - start) / 60000;

  if (minutes < MIN_WINDOW_MIN) throw new ApiError(400, "The pickup window must be at least 30 minutes long");
  if (minutes > MAX_WINDOW_HOURS * 60) throw new ApiError(400, `The pickup window can be at most ${MAX_WINDOW_HOURS} hours`);
  if (end.getTime() < now.getTime() + 15 * 60000) throw new ApiError(400, "That pickup window has already passed");
  if (start.getTime() > now.getTime() + MAX_DAYS_AHEAD * 86400000) {
    throw new ApiError(400, `You can schedule up to ${MAX_DAYS_AHEAD} days ahead`);
  }
  return { start, end };
}

module.exports = { parseSlot };