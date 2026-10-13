const Pickup = require("../models/Pickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { etaBetween } = require("../utils/eta");
const { isActor } = require("../utils/teamAccess");
const { touchCollectorLocation } = require("../utils/touchCollectorLocation");

const trackingOf = (p) => ({
  onTheWayAt: p.tracking?.onTheWayAt || null,
  etaMinutes: p.tracking?.etaMinutes ?? null,
  etaAt: p.tracking?.etaAt || null,
  requesterReadyAt: p.tracking?.requesterReadyAt || null,
});

// POST /api/pickup/:id/on-the-way  (the collector, or the team member the job
// is assigned to) — "I'm heading there now." Records the departure, works out
// an ETA from where they are, and tells the requester. Calling it again just
// refreshes the ETA.
exports.markOnTheWay = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");
  if (!isActor(pickup, req.user.id)) throw new ApiError(403, "You are not assigned to this pickup");
  if (pickup.status !== "accepted") throw new ApiError(400, "You can only head out for an accepted pickup that hasn't started");

  const { distanceKm, etaMinutes } = etaBetween({ lat, lng }, pickup.location);
  const firstTime = !pickup.tracking?.onTheWayAt;
  const now = new Date();

  const updated = await Pickup.findByIdAndUpdate(
    pickup._id,
    {
      $set: {
        "tracking.etaMinutes": etaMinutes,
        "tracking.etaAt": new Date(now.getTime() + etaMinutes * 60000),
        ...(firstTime ? { "tracking.onTheWayAt": now } : {}),
      },
    },
    { new: true }
  );
  touchCollectorLocation(req.user.id, lat, lng);

  if (firstTime) {
    await notifyUser(req.io, pickup.user, {
      type: "status_update",
      text: `Your collector is on the way — about ${etaMinutes} min away. Keep your start code ready.`,
      pickupId: pickup._id,
    });
  }
  req.io.emit("updatePickup", updated);
  res.json({ ...trackingOf(updated), distanceKm });
});

// POST /api/pickup/:id/ready  (the requester) — "I'm home, come over."
exports.markReady = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, status: "accepted", "tracking.requesterReadyAt": null },
    { $set: { "tracking.requesterReadyAt": new Date() } },
    { new: true }
  );
  if (!pickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (String(existing.user) !== String(req.user.id)) throw new ApiError(403, "This isn't your pickup");
    if (existing.tracking?.requesterReadyAt) return res.json(trackingOf(existing));
    throw new ApiError(400, "You can confirm once a collector has accepted and before the pickup starts");
  }

  const who = pickup.assignedTo || pickup.collector;
  if (who) {
    await notifyUser(req.io, who, {
      type: "status_update",
      text: `The requester is home and ready for your ${pickup.scrapType} pickup.`,
      pickupId: pickup._id,
    });
  }
  req.io.emit("updatePickup", pickup);
  res.json(trackingOf(pickup));
});