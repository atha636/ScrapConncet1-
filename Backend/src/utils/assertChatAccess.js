const Pickup = require("../models/Pickup");
const ApiError = require("./ApiError");

/**
 * Loads a pickup and confirms the given user is either the requester or the
 * assigned collector — the only two people allowed to see/send chat messages
 * for it. Chat only makes sense once a collector is assigned, so pending
 * pickups are rejected too.
 */
async function assertChatAccess(pickupId, userId) {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  if (pickup.status === "pending" || !pickup.collector) {
    throw new ApiError(403, "Chat opens once a collector accepts this pickup");
  }

  const isRequester = String(pickup.user) === String(userId);
  const isCollector = String(pickup.collector) === String(userId);
  if (!isRequester && !isCollector) {
    throw new ApiError(403, "You don't have access to this conversation");
  }

  return pickup;
}

module.exports = assertChatAccess;