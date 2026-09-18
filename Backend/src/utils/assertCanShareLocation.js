const Pickup = require("../models/Pickup");
const ApiError = require("./ApiError");

/**
 * Loads a pickup and confirms the given user is genuinely its assigned
 * collector, with the job in a state where "en route" is meaningful.
 * Deliberately narrower than assertChatAccess — chat is bidirectional (the
 * requester can talk too), but location sharing only ever flows one
 * direction, from the collector out. Letting a requester's socket emit
 * location updates for their own pickup would let anyone type in fake
 * coordinates for a "collector" location the app then displays as real.
 *
 * "accepted" or "in_progress" only, same reasoning as
 * RoutePlanner/getCollectorRoute's own status filter elsewhere in this
 * codebase — a completed or cancelled job isn't something anyone is still
 * driving toward.
 */
async function assertCanShareLocation(pickupId, userId) {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  if (!["accepted", "in_progress"].includes(pickup.status)) {
    throw new ApiError(403, "Live location is only available while a pickup is on its way");
  }

  if (String(pickup.collector) !== String(userId)) {
    throw new ApiError(403, "Only the assigned collector can share location for this pickup");
  }

  return pickup;
}

module.exports = assertCanShareLocation;