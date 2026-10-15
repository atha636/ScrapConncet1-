const crypto = require("crypto");
const mongoose = require("mongoose");
const Pickup = require("../models/Pickup");
const User = require("../models/User");
const SafetyAlert = require("../models/SafetyAlert");
const TripShare = require("../models/TripShare");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { logAudit } = require("../utils/audit");
const { isActor } = require("../utils/teamAccess");
const { etaBetween } = require("../utils/eta");

const LIVE_STATUSES = ["accepted", "in_progress"];
// A link keeps working this long after the pickup ends, so family can see
// "arrived safely" rather than a dead page.
const LINK_GRACE_MS = 3 * 60 * 60 * 1000;
const round3 = (n) => (typeof n === "number" ? Math.round(n * 1000) / 1000 : null);

const loadPickupForParticipant = async (pickupId, userId) => {
  if (!mongoose.isValidObjectId(pickupId)) throw new ApiError(404, "Pickup not found");
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) throw new ApiError(404, "Pickup not found");
  const isRequester = String(pickup.user) === String(userId);
  const isCollector = isActor(pickup, userId);
  if (!isRequester && !isCollector) throw new ApiError(403, "This isn't your pickup");
  return { pickup, role: isRequester ? "user" : "collector" };
};

const requireLive = (pickup) => {
  if (!LIVE_STATUSES.includes(pickup.status)) {
    throw new ApiError(400, "Safety tools are available while a pickup is in progress");
  }
};

const findActiveShare = (pickupId) => TripShare.findOne({ pickup: pickupId, revokedAt: null });

const ensureShare = async (pickupId, userId) => {
  const existing = await findActiveShare(pickupId);
  if (existing) return existing;
  return TripShare.create({
    pickup: pickupId,
    token: crypto.randomBytes(18).toString("hex"),
    createdBy: userId,
  });
};

/* ------------------------------ trip sharing ------------------------------ */

// GET /api/safety/pickups/:id/share
exports.getShare = asyncHandler(async (req, res) => {
  const { pickup } = await loadPickupForParticipant(req.params.id, req.user.id);
  const share = await findActiveShare(pickup._id);
  res.json({ active: !!share, token: share?.token || null });
});

// POST /api/safety/pickups/:id/share — creates the link (or returns the live one)
exports.createShare = asyncHandler(async (req, res) => {
  const { pickup } = await loadPickupForParticipant(req.params.id, req.user.id);
  requireLive(pickup);
  const share = await ensureShare(pickup._id, req.user.id);
  res.status(201).json({ active: true, token: share.token });
});

// DELETE /api/safety/pickups/:id/share — stop sharing
exports.revokeShare = asyncHandler(async (req, res) => {
  const { pickup } = await loadPickupForParticipant(req.params.id, req.user.id);
  await TripShare.updateMany({ pickup: pickup._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  res.json({ active: false, token: null });
});

// GET /api/safety/public/trip/:token — no login; this is what the link opens.
// Deliberately thin: first name only, no phone numbers, no street address.
exports.getPublicTrip = asyncHandler(async (req, res) => {
  const share = await TripShare.findOne({ token: String(req.params.token || "") });
  if (!share || share.revokedAt) throw new ApiError(404, "This link isn't active");

  const pickup = await Pickup.findById(share.pickup).populate("collector assignedTo", "name");
  if (!pickup) throw new ApiError(404, "This link isn't active");

  const live = LIVE_STATUSES.includes(pickup.status);
  const endedAt = pickup.updatedAt ? new Date(pickup.updatedAt).getTime() : 0;
  if (!live && Date.now() - endedAt > LINK_GRACE_MS) throw new ApiError(404, "This link has expired");

  const worker = pickup.assignedTo || pickup.collector;
  const loc = share.lastLocation?.at ? share.lastLocation : null;
  let distanceKm = null;
  let etaMinutes = null;
  if (live && loc && pickup.location) {
    ({ distanceKm, etaMinutes } = etaBetween({ lat: loc.lat, lng: loc.lng }, pickup.location));
  }

  res.json({
    status: pickup.status,
    live,
    scrapType: pickup.scrapType,
    collectorName: worker?.name ? String(worker.name).split(" ")[0] : null,
    slot: pickup.slot?.start ? { start: pickup.slot.start, end: pickup.slot.end } : null,
    destination: pickup.location ? { lat: round3(pickup.location.lat), lng: round3(pickup.location.lng) } : null,
    lastLocation: loc ? { lat: loc.lat, lng: loc.lng, at: loc.at } : null,
    distanceKm,
    etaMinutes,
    updatedAt: pickup.updatedAt,
  });
});

/* ----------------------------------- SOS ---------------------------------- */

// POST /api/safety/pickups/:id/sos
exports.raiseSos = asyncHandler(async (req, res) => {
  const { pickup, role } = await loadPickupForParticipant(req.params.id, req.user.id);
  requireLive(pickup);

  const existing = await SafetyAlert.findOne({ pickup: pickup._id, triggeredBy: req.user.id, status: "active" });
  const share = await ensureShare(pickup._id, req.user.id);
  if (existing) return res.json({ alertId: existing._id, token: share.token, repeated: true });

  const { lat, lng, note } = req.body;
  const alert = await SafetyAlert.create({
    pickup: pickup._id,
    triggeredBy: req.user.id,
    triggeredRole: role,
    lat: lat ?? null,
    lng: lng ?? null,
    note: note || "",
  });

  const me = await User.findById(req.user.id).select("name");
  const admins = await User.find({ role: "admin", isActive: true }).select("_id");
  await Promise.all(
    admins.map((a) =>
      notifyUser(req.io, a._id, {
        type: "sos_alert",
        text: `SOS from ${role === "collector" ? "collector" : "requester"} ${me?.name || ""} — pickup in progress. Open Safety now.`,
        pickupId: pickup._id,
      }).catch((err) => console.error("SOS notify failed:", err.message))
    )
  );

  res.status(201).json({ alertId: alert._id, token: share.token, repeated: false });
});

/* ---------------------------------- admin --------------------------------- */

const person = (u) => (u ? { id: u._id, name: u.name, phone: u.phone || null, role: u.role } : null);

// GET /api/safety/admin/alerts?status=active|resolved
exports.adminList = asyncHandler(async (req, res) => {
  const status = req.query.status === "resolved" ? "resolved" : "active";
  const alerts = await SafetyAlert.find({ status })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("triggeredBy", "name phone role")
    .populate("resolvedBy", "name")
    .populate({
      path: "pickup",
      select: "scrapType status user collector assignedTo location createdAt",
      populate: [
        { path: "user", select: "name phone role" },
        { path: "collector", select: "name phone role" },
        { path: "assignedTo", select: "name phone role" },
      ],
    });

  const tokens = await TripShare.find({ pickup: { $in: alerts.map((a) => a.pickup?._id).filter(Boolean) }, revokedAt: null })
    .select("pickup token lastLocation");
  const shareByPickup = new Map(tokens.map((t) => [String(t.pickup), t]));

  const activeCount = await SafetyAlert.countDocuments({ status: "active" });

  res.json({
    activeCount,
    alerts: alerts.map((a) => {
      const p = a.pickup;
      const share = p ? shareByPickup.get(String(p._id)) : null;
      return {
        id: a._id,
        status: a.status,
        triggeredRole: a.triggeredRole,
        triggeredBy: person(a.triggeredBy),
        note: a.note,
        location: a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
        resolvedByName: a.resolvedBy?.name || null,
        resolutionNote: a.resolutionNote,
        shareToken: share?.token || null,
        pickup: p
          ? {
              id: p._id,
              scrapType: p.scrapType,
              status: p.status,
              requester: person(p.user),
              collector: person(p.assignedTo || p.collector),
              location: p.location ? { lat: p.location.lat, lng: p.location.lng } : null,
            }
          : null,
      };
    }),
  });
});

// PATCH /api/safety/admin/alerts/:id/resolve
exports.adminResolve = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Alert not found");
  const alert = await SafetyAlert.findOneAndUpdate(
    { _id: req.params.id, status: "active" },
    { $set: { status: "resolved", resolvedBy: req.user.id, resolvedAt: new Date(), resolutionNote: req.body.note || "" } },
    { new: true }
  );
  if (!alert) throw new ApiError(404, "Alert not found or already resolved");
  await logAudit(req, { action: "sos.resolve", targetType: "SafetyAlert", targetId: alert._id, details: { pickup: alert.pickup } });
  res.json({ id: alert._id, status: alert.status });
});