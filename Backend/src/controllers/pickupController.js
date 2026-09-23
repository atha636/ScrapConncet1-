const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { estimateItemsPrice } = require("../utils/pricing");
const { estimateScrapFromImage } = require("../utils/scrapEstimator");
const notifyUser = require("../utils/notifyUser");
const syncCollectorBadges = require("../utils/badgeNotifier");
const { activateReferralIfEligible } = require("../utils/referralActivation");
const { optimizeRoute, haversineKm } = require("../utils/routeOptimizer");
const { findSuggestedBatch } = require("../utils/suggestedBatch");
const { touchCollectorLocation } = require("../utils/touchCollectorLocation");
const { isCollectorAvailableNow } = require("../utils/collectorAvailability");
const { NO_SHOW_SUSPENSION_THRESHOLD } = require("../utils/reliabilityRules");

// Upper bound on stops fed into the optimizer. 2-opt compares every pair
// of stops on every pass, so cost grows quadratically — fine for the
// realistic case (a collector juggling a handful of active jobs), but this
// caps the pathological one rather than letting a single request burn CPU
// on hundreds of stops.
const MAX_ROUTE_STOPS = 50;

const STATUS_LABELS = {
  accepted: "accepted",
  in_progress: "started",
  completed: "completed",
  cancelled: "cancelled",
};

const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

// POST /api/pickup/estimate-from-photo  (user only)
//
// Best-effort suggestion, never a hard dependency — createPickup below
// doesn't call this and works exactly the same with or without it. This
// exists purely to pre-fill the item list so a requester isn't starting
// from a blank "Metal, 0kg" row every time; they still review and submit
// through the normal create-pickup flow afterward, editable at every
// step (see the frontend's RequestPickup.jsx).
exports.estimateFromPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Attach a photo to get an estimate");

  const result = await estimateScrapFromImage({ buffer: req.file.buffer, mimeType: req.file.mimetype });

  // Null means "couldn't estimate" (no API key configured, the call
  // failed, an unparseable response) — not an error the requester needs
  // to see, just nothing to pre-fill. 200 with an empty result rather
  // than a 4xx/5xx, since nothing about their request was actually wrong.
  res.json(result || { items: [], notes: "" });
});

// POST /api/pickup/request
exports.createPickup = asyncHandler(async (req, res) => {
  const { items, contactName, contactPhone, lat, lng, address } = req.body;

  const pickup = await Pickup.create({
    user: req.user.id,
    items,
    contactName,
    contactPhone,
    image: req.file?.path || req.file?.secure_url || null,
    location: { lat, lng, address },
    price: estimateItemsPrice(items),
    statusHistory: [{ status: "pending", changedBy: req.user.id }],
  });

  req.io.emit("newPickup", pickup);
  res.status(201).json(pickup);
});

// GET /api/pickup/:id  (the requester or the assigned collector only)
// Exists mainly to support deep-linking — a push notification or shared
// link can point straight at one pickup without needing it to already be
// present in whatever paginated list the app happens to have loaded.
exports.getPickupById = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id)
    .populate("user", "name phone")
    .populate("collector", "name phone rating");

  if (!pickup) throw new ApiError(404, "Pickup not found");

  const isRequester = String(pickup.user._id) === String(req.user.id);
  const isCollector = pickup.collector && String(pickup.collector._id) === String(req.user.id);
  if (!isRequester && !isCollector) {
    throw new ApiError(403, "You don't have access to this pickup");
  }

  res.json(pickup);
});

// GET /api/pickup/my-requests
exports.getMyRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const [data, total] = await Promise.all([
    Pickup.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("collector", "name phone rating"),
    Pickup.countDocuments({ user: req.user.id }),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/pickup/available  (collector only)
// Pass ?lat=&lng= to get pickups sorted by real distance (nearest first),
// optionally bounded by ?radiusKm=. Without coordinates, falls back to the
// original newest-first behavior — old clients/tests keep working.
exports.getAvailable = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // Deleting/deactivating an account cancels that person's own *open*
  // pickup requests (see authController.deleteAccount), but this is a
  // second line of defense — e.g. for rows that predate that fix, or an
  // admin deactivation — so a request tied to an account nobody can reach
  // never lingers in the feed collectors see.
  const activeRequesterIds = await User.find({ isActive: true }).distinct("_id");

  if (!hasCoords) {
    const filter = { status: "pending", user: { $in: activeRequesterIds } };
    const [data, total] = await Promise.all([
      Pickup.find(filter)
        .sort({ isUrgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name phone"),
      Pickup.countDocuments(filter),
    ]);

    return res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  const radiusKm = Math.min(100, Math.max(1, parseFloat(req.query.radiusKm) || 25));

  touchCollectorLocation(req.user.id, lat, lng);

  // $geoNear must be the first stage in the pipeline and requires the
  // 2dsphere index defined on Pickup.geo. It computes distanceField for us
  // in the same query — no separate pass to calculate distance in JS.
  const basePipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        query: { status: "pending", user: { $in: activeRequesterIds } },
        spherical: true,
      },
    },
  ];

  const [data, totalResult] = await Promise.all([
    Pickup.aggregate([
      ...basePipeline,
      // $geoNear's implicit sort is by distance — re-sort urgent-first while
      // keeping distance as the tiebreaker within each group.
      { $sort: { isUrgent: -1, distanceMeters: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, phone: 1 } }],
        },
      },
      { $unwind: "$user" },
      { $addFields: { distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] } } },
    ]),
    Pickup.aggregate([...basePipeline, { $count: "total" }]),
  ]);

  const total = totalResult[0]?.total || 0;
  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/pickup/collector/jobs  (collector's accepted/active/completed jobs)
exports.getCollectorJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { collector: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Pickup.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name phone"),
    Pickup.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/pickup/collector/route?lat=&lng=  (collector only)
//
// Orders this collector's *active* jobs into an efficient visiting
// sequence from wherever they are right now. Deliberately scoped to
// accepted/in_progress only — a completed or cancelled job isn't
// somewhere they still need to drive to, and including them would pad the
// route with stops that are already done.
//
// Unpaginated on purpose, unlike getCollectorJobs above: a route is only
// meaningful as a whole. Handing back page 1 of a route would produce an
// ordering that changes the moment you look at page 2, which is worse than
// useless. In practice a collector's active-job count is small enough that
// this is a non-issue; MAX_ROUTE_STOPS below bounds the pathological case.
exports.getCollectorRoute = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError(400, "Your current location is required to plan a route");
  }

  const start = { lat, lng };
  touchCollectorLocation(req.user.id, lat, lng);
  const jobs = await Pickup.find({
    collector: req.user.id,
    status: { $in: ["accepted", "in_progress"] },
  })
    .limit(MAX_ROUTE_STOPS)
    .populate("user", "name phone");

  const stops = jobs.map((job) => ({
    id: String(job._id),
    lat: job.location.lat,
    lng: job.location.lng,
  }));

  const { ordered, totalKm, naiveKm, savedKm } = optimizeRoute(start, stops);

  // Re-attached after optimizing rather than carried through it — the
  // optimizer only ever needs coordinates, so keeping full Mongoose
  // documents out of its inner loops (which compare every pair of stops,
  // repeatedly) keeps it working on plain numbers.
  const jobsById = Object.fromEntries(jobs.map((j) => [String(j._id), j]));

  res.json({
    stops: ordered.map((stop, index) => {
      const job = jobsById[stop.id];
      return {
        order: index + 1,
        pickup: job,
        // Distance from the previous stop (or from the collector's own
        // position, for the first one) — this is the per-leg number a
        // collector actually reads while driving, not a running total.
        legKm: Number(
          (index === 0
            ? haversineKm(start, stop)
            : haversineKm(ordered[index - 1], stop)
          ).toFixed(2)
        ),
      };
    }),
    totalKm: Number(totalKm.toFixed(2)),
    naiveKm: Number(naiveKm.toFixed(2)),
    savedKm: Number(savedKm.toFixed(2)),
  });
});

// GET /api/pickup/collector/suggested-batch?lat=&lng=&radiusKm=  (collector only)
//
// The manual version of this is already on the Available tab — a
// collector can tick several pickups and hit "Accept N" themselves. This
// answers the question that manual selection leaves to guesswork: *which*
// pending pickups are actually close enough to each other to be worth
// bundling into one trip, starting from wherever the collector is right
// now. It never accepts anything on its own — it only returns a suggested
// cluster for the frontend to preselect, same as getCollectorRoute only
// ever suggests an order.
exports.getSuggestedBatch = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError(400, "Your current location is required to suggest a batch");
  }

  const radiusKm = Math.min(100, Math.max(1, parseFloat(req.query.radiusKm) || 25));
  const maxStops = Math.min(20, Math.max(2, parseInt(req.query.maxStops, 10) || 6));
  // Loose enough to catch a real neighbourhood cluster, tight enough that
  // this never strings together stops that only look close on a 25km-wide
  // map — same reasoning as AVAILABLE_RADIUS_KM being much larger than
  // what any single trip should actually span.
  const maxLegKm = Math.min(10, Math.max(0.5, parseFloat(req.query.maxLegKm) || 3));

  touchCollectorLocation(req.user.id, lat, lng);

  const result = await findSuggestedBatch({ lat, lng }, { radiusKm, maxStops, maxLegKm });
  res.json(result);
});

// PATCH /api/pickup/:id/accept  (collector only)
exports.acceptPickup = asyncHandler(async (req, res) => {
  const collectorUser = await User.findById(req.user.id);
  if (collectorUser?.collectorSuspended) {
    throw new ApiError(
      403,
      "Your account is suspended from accepting new pickups due to low ratings. Contact support."
    );
  }
  // A distinct message from the suspension one above — this is the
  // collector's own choice (paused, or outside their set hours), not a
  // platform-imposed restriction, so it shouldn't read like a penalty.
  if (!isCollectorAvailableNow(collectorUser)) {
    throw new ApiError(403, "You're currently marked as unavailable. Resume availability to accept pickups.");
  }

  // Atomic find-and-update, scoped to status: "pending" in the filter itself
  // — not a separate read-then-write. Two collectors tapping "Accept" on the
  // same pickup at the same moment can no longer both pass a status check
  // and then both save; only one findOneAndUpdate can match and flip the
  // status in a single atomic op, so the loser reliably gets null back
  // instead of silently overwriting the winner's collector assignment.
  const pickup = await Pickup.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    {
      $set: { collector: req.user.id, status: "accepted" },
      $push: { statusHistory: { status: "accepted", changedBy: req.user.id } },
    },
    { new: true }
  );

  if (!pickup) {
    const exists = await Pickup.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? "Pickup is no longer available" : "Pickup not found");
  }

  await pickup.populate("collector", "name");

  req.io.emit("updatePickup", pickup);

  await notifyUser(req.io, pickup.user, {
    type: "pickup_accepted",
    text: `${pickup.collector.name} accepted your ${pickup.scrapType} pickup request`,
    pickupId: pickup._id,
  });

  // Fire-and-forget — accepting this job may have just crossed the
  // fast-responder threshold or grown the accept-time sample enough to
  // surface it for the first time (see badgeNotifier.js). Never awaited
  // into the response: a badge check failing should never make Accept
  // itself fail.
  syncCollectorBadges(req.io, req.user.id).catch((err) =>
    console.error("Badge sync after accept failed:", err.message)
  );

  res.json(pickup);
});

// POST /api/pickup/:id/offer  (collector only)
//
// Opens (or re-opens, after a decline) a price negotiation on a still-
// "pending" pickup instead of the collector's only choice being accept
// the system price as-is or skip the job entirely.
//
// Atomic, same pattern as acceptPickup: the filter itself only matches a
// pickup with no *other* collector currently negotiating on it, so two
// collectors racing to open a negotiation on the same pickup can't both
// land — one gets negotiation.collector set, the other gets null back and
// a clear 409, exactly like acceptPickup's own race.
exports.proposeOffer = asyncHandler(async (req, res) => {
  const { amount, note } = req.body;

  const pickup = await Pickup.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "pending",
      $or: [
        { "negotiation.status": "none" },
        { "negotiation.status": "declined" },
        { "negotiation.collector": req.user.id },
      ],
    },
    {
      $set: { "negotiation.status": "pending", "negotiation.collector": req.user.id },
      $push: { "negotiation.offers": { amount, note, offeredBy: "collector" } },
    },
    { new: true }
  );

  if (!pickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (existing.status !== "pending") {
      throw new ApiError(409, "This pickup is no longer open for offers");
    }
    throw new ApiError(409, "Another collector is already negotiating this pickup");
  }

  req.io.emit("updatePickup", pickup);

  await notifyUser(req.io, pickup.user, {
    type: "price_offer",
    text: `A collector offered ₹${amount} for your ${pickup.scrapType} pickup (listed at ₹${pickup.price})`,
    pickupId: pickup._id,
  });

  res.json(pickup);
});

// PATCH /api/pickup/:id/offer  (the requester, or the negotiating collector)
//
// Responds to the other party's most recent offer. Which role the caller
// must be is derived from who made the last offer — you can only accept,
// decline, or counter an offer the *other* side made, never your own.
exports.respondToOffer = asyncHandler(async (req, res) => {
  const { action, amount, note } = req.body;

  const pickup = await Pickup.findById(req.params.id);
  if (!pickup) throw new ApiError(404, "Pickup not found");

  const isRequester = String(pickup.user) === String(req.user.id);
  const isNegotiatingCollector =
    pickup.negotiation.collector && String(pickup.negotiation.collector) === String(req.user.id);

  if (!isRequester && !isNegotiatingCollector) {
    throw new ApiError(403, "You're not a party to this negotiation");
  }

  if (pickup.status !== "pending" || pickup.negotiation.status !== "pending") {
    throw new ApiError(400, "There's no active offer to respond to");
  }

  const lastOffer = pickup.negotiation.offers[pickup.negotiation.offers.length - 1];
  const callerRole = isRequester ? "requester" : "collector";
  if (lastOffer.offeredBy === callerRole) {
    throw new ApiError(400, "Waiting on the other party to respond to your last offer");
  }

  // DECLINE — ends this negotiation and frees the pickup up for any
  // collector (including this one) to propose a fresh offer, or for the
  // original system price to still be accepted the normal way.
  if (action === "decline") {
    const updated = await Pickup.findOneAndUpdate(
      { _id: pickup._id, "negotiation.status": "pending" },
      { $set: { "negotiation.status": "declined", "negotiation.collector": null } },
      { new: true }
    );

    req.io.emit("updatePickup", updated);
    const otherPartyId = isRequester ? pickup.negotiation.collector : pickup.user;
    await notifyUser(req.io, otherPartyId, {
      type: "price_offer",
      text: `Your offer on the ${pickup.scrapType} pickup was declined`,
      pickupId: pickup._id,
    });

    return res.json(updated);
  }

  // COUNTER — pushes a new offer from the caller's side; negotiation stays
  // open and the turn passes back to the other party.
  if (action === "counter") {
    const updated = await Pickup.findOneAndUpdate(
      { _id: pickup._id, "negotiation.status": "pending" },
      { $push: { "negotiation.offers": { amount, note, offeredBy: callerRole } } },
      { new: true }
    );

    req.io.emit("updatePickup", updated);
    const otherPartyId = isRequester ? pickup.negotiation.collector : pickup.user;
    await notifyUser(req.io, otherPartyId, {
      type: "price_offer",
      text: `Countered at ₹${amount} on the ${pickup.scrapType} pickup`,
      pickupId: pickup._id,
    });

    return res.json(updated);
  }

  // ACCEPT — closes the negotiation and, in the same atomic step, does
  // what acceptPickup normally does: assigns the collector, flips the
  // pickup to "accepted", and locks in the agreed price. Filtered on both
  // pickup.status and negotiation.status still being "pending" so this
  // can't double-fire if the request is retried after a slow response.
  const updated = await Pickup.findOneAndUpdate(
    { _id: pickup._id, status: "pending", "negotiation.status": "pending" },
    {
      $set: {
        status: "accepted",
        collector: pickup.negotiation.collector,
        price: lastOffer.amount,
        "negotiation.status": "accepted",
      },
      $push: { statusHistory: { status: "accepted", changedBy: req.user.id } },
    },
    { new: true }
  ).populate("collector", "name");

  if (!updated) {
    throw new ApiError(409, "This pickup was already accepted or is no longer available");
  }

  req.io.emit("updatePickup", updated);

  const otherPartyId = isRequester ? updated.collector._id : updated.user;
  await notifyUser(req.io, otherPartyId, {
    type: isRequester ? "pickup_accepted" : "price_offer",
    text: isRequester
      ? `${updated.collector.name} accepted your ${updated.scrapType} pickup at ₹${updated.price}`
      : `Your offer of ₹${updated.price} on the ${updated.scrapType} pickup was accepted`,
    pickupId: updated._id,
  });

  // Same fire-and-forget badge check as the normal accept path — this is
  // still an acceptance from the collector's perspective, just one that
  // arrived via negotiation instead of the plain Accept button.
  if (!isRequester) {
    syncCollectorBadges(req.io, req.user.id).catch((err) =>
      console.error("Badge sync after offer-accept failed:", err.message)
    );
  }

  res.json(updated);
});

// PATCH /api/pickup/collector/batch-accept  (collector only)
//
// Accepts multiple pending pickups in one request — the natural next step
// after browsing a batch of nearby jobs (see RoutePlanner/the Available
// tab's geo-sorted list) rather than tapping Accept, waiting, tapping
// Accept again for each one individually.
//
// Deliberately partial-success, not all-or-nothing: by the time a
// collector has reviewed a screenful of jobs and tapped "Accept 4", a few
// seconds have passed — long enough for another collector to have taken
// one of them. Failing the whole batch over one already-gone pickup would
// throw away the 3 that were still fine, so each id is attempted
// independently and the response reports exactly which succeeded and
// which didn't, the same way a real "add multiple items to cart" flow
// would.
exports.batchAcceptPickups = asyncHandler(async (req, res) => {
  const collectorUser = await User.findById(req.user.id);
  if (collectorUser?.collectorSuspended) {
    throw new ApiError(
      403,
      "Your account is suspended from accepting new pickups due to low ratings. Contact support."
    );
  }
  if (!isCollectorAvailableNow(collectorUser)) {
    throw new ApiError(403, "You're currently marked as unavailable. Resume availability to accept pickups.");
  }

  const { ids } = req.body;
  const accepted = [];
  const failed = [];

  // Sequential, not Promise.all — these are atomic per-document updates
  // with no cross-document contention risk, so there's no correctness
  // reason to run them concurrently, and sequential keeps this simple to
  // reason about and easy to bound (MAX_BATCH_ACCEPT already caps total
  // work either way).
  for (const id of ids) {
    // Same atomic findOneAndUpdate as the single-accept path above — see
    // that handler's own comment for why this, not a read-then-write, is
    // what actually makes concurrent accepts safe.
    const pickup = await Pickup.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: { collector: req.user.id, status: "accepted" },
        $push: { statusHistory: { status: "accepted", changedBy: req.user.id } },
      },
      { new: true }
    ).populate("user", "name");

    if (!pickup) {
      const exists = await Pickup.exists({ _id: id });
      failed.push({ id, reason: exists ? "unavailable" : "not_found" });
      continue;
    }

    accepted.push(pickup);
    req.io.emit("updatePickup", pickup);
    await notifyUser(req.io, pickup.user, {
      type: "pickup_accepted",
      text: `${collectorUser.name} accepted your ${pickup.scrapType} pickup request`,
      pickupId: pickup._id,
    });
  }

  // Once for the whole batch, not once per accepted pickup — badge state
  // (accept-time average, milestone counts) only needs to reflect where
  // things landed after everything settled, not every intermediate step
  // along the way. Only worth checking at all if something actually got
  // accepted.
  if (accepted.length > 0) {
    syncCollectorBadges(req.io, req.user.id).catch((err) =>
      console.error("Badge sync after batch accept failed:", err.message)
    );
  }

  res.json({ accepted, failed });
});

// PATCH /api/pickup/:id/cancel  (requester only, must own the request)
exports.cancelByRequester = asyncHandler(async (req, res) => {
  // Atomic, scoped by both ownership and current status in the filter
  // itself — matching acceptPickup's pattern below rather than a separate
  // read-then-write. Without this, a double-tap or retried "Cancel" request
  // could both read a still-cancellable status and both push a duplicate
  // "cancelled" history entry (and, worse, both fire the collector
  // notification below a second time) before either write lands.
  const pickup = await Pickup.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, status: { $in: ["pending", "accepted"] } },
    { $set: { status: "cancelled" }, $push: { statusHistory: { status: "cancelled", changedBy: req.user.id } } },
    { new: true }
  );

  if (!pickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (String(existing.user) !== String(req.user.id)) {
      throw new ApiError(403, "This isn't your pickup request");
    }
    // Once a collector is en route (in_progress) it's too late to cancel
    // from the app — real-world coordination should happen via chat/phone
    // instead.
    throw new ApiError(400, `Can't cancel a pickup that's already ${existing.status}`);
  }

  req.io.emit("updatePickup", pickup);

  if (pickup.collector) {
    await notifyUser(req.io, pickup.collector, {
      type: "status_update",
      text: `The ${pickup.scrapType} pickup you accepted was cancelled by the requester`,
      pickupId: pickup._id,
    });
  }

  res.json(pickup);
});

// POST /api/pickup/:id/report-no-show  (requester only)
//
// Reopens a pickup whose collector accepted it but never made any
// progress — reusable path back into the Available pool for a different
// collector, rather than forcing the requester through cancelByRequester
// above (which ends the request entirely) just because the first match
// didn't work out. Only callable once isStalled is already true (set by
// jobs/escalateStalledPickups.js after STALLED_PICKUP_MINUTES with no
// status change), so this can't be used to bump a collector who only
// just accepted.
exports.reportNoShow = asyncHandler(async (req, res) => {
  const { note } = req.body;

  // { new: false } deliberately — the return value here is the
  // PRE-update document, which is what this needs: the collector who
  // gets the no-show recorded against them is whoever the filter just
  // matched on, and $set below is about to null that field out. The
  // filter itself is still what makes this atomic and idempotent (scoped
  // by ownership + isStalled, same as acceptPickup/cancelByRequester
  // elsewhere in this file) — a double-tap can't match twice and can't
  // record two no-shows for one stall.
  const staleCollectorPickup = await Pickup.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, status: "accepted", isStalled: true },
    {
      $set: {
        status: "pending",
        collector: null,
        isStalled: false,
        stalledAt: null,
        negotiation: { status: "none", collector: null, offers: [] },
      },
      $push: { statusHistory: { status: "pending", changedBy: req.user.id } },
    },
    { new: false }
  );

  if (!staleCollectorPickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (String(existing.user) !== String(req.user.id)) {
      throw new ApiError(403, "This isn't your pickup request");
    }
    if (existing.status !== "accepted") {
      throw new ApiError(400, "This pickup isn't currently with a collector");
    }
    throw new ApiError(400, "This collector hasn't stalled long enough to report yet");
  }

  const noShowCollectorId = staleCollectorPickup.collector;

  const updatedCollector = await User.findByIdAndUpdate(
    noShowCollectorId,
    { $inc: { noShowCount: 1 } },
    { new: true }
  );

  // Same gate ratingController.js uses for the rating-based version of
  // this — never re-suspend (and re-stamp collectorSuspendedAt) someone
  // who's already suspended, whether that suspension came from a rating
  // or an earlier no-show.
  if (!updatedCollector.collectorSuspended && updatedCollector.noShowCount >= NO_SHOW_SUSPENSION_THRESHOLD) {
    updatedCollector.collectorSuspended = true;
    updatedCollector.collectorSuspendedAt = new Date();
    await updatedCollector.save();
  }

  const reopened = await Pickup.findById(req.params.id);
  req.io.emit("updatePickup", reopened);
  // Reopened pickups need to reach every collector's Available feed the
  // same way a brand-new one does — reuses the exact event createPickup
  // emits, not just updatePickup, since a collector who never had this
  // pickup in view (it was never theirs) needs it to appear, not merely
  // refresh in place.
  req.io.emit("newPickup", reopened);

  await notifyUser(req.io, noShowCollectorId, {
    type: "status_update",
    text: `You were reported as a no-show for the ${reopened.scrapType} pickup${note ? `: "${note}"` : ""} — it's been reopened for another collector`,
    pickupId: reopened._id,
  });

  res.json(reopened);
});

// Reverse lookup for updateStatus below: which current status(es) a pickup
// must be in for a given target status to be a legal transition. Built this
// way (rather than the more natural fromStatus -> allowed toStatuses map)
// specifically so it can be used as a MongoDB $in filter directly in the
// atomic update — see the comment there for why that matters.
const VALID_FROM_STATUSES = {
  in_progress: ["accepted"],
  cancelled: ["accepted", "in_progress"],
  completed: ["in_progress"],
};

exports.updateStatus = asyncHandler(async (req, res) => {
  const nextStatus = req.body.status;
  const validFrom = VALID_FROM_STATUSES[nextStatus] || [];

  // Required, not optional — proof of collection is most of this field's
  // value. An optional photo would mean disputes on pickups where a
  // collector simply skipped uploading one are back to square one, no
  // better off than before this existed at all.
  if (nextStatus === "completed" && !req.file) {
    throw new ApiError(400, "A completion photo is required to mark this pickup as done");
  }

  const completionPhotoUrl = req.file?.path || req.file?.secure_url;

  // Atomic, scoped by both collector ownership and current status in the
  // filter itself — not a separate read-then-write (see acceptPickup's
  // comment for the same pattern and the race it closes). Without this, two
  // near-simultaneous requests to mark the same pickup "completed" — a
  // realistic double-tap, or a client retrying after a slow/dropped
  // response — could both read status "in_progress", both pass validation,
  // and both push a duplicate history entry. The unique index on
  // Transaction(pickup, type) already prevented double-crediting the
  // earning itself, but the pickup's own status/history update had no
  // equivalent protection until now.
  const pickup =
    validFrom.length > 0
      ? await Pickup.findOneAndUpdate(
          { _id: req.params.id, collector: req.user.id, status: { $in: validFrom } },
          {
            $set: {
              status: nextStatus,
              ...(completionPhotoUrl ? { completionPhoto: completionPhotoUrl } : {}),
            },
            $push: { statusHistory: { status: nextStatus, changedBy: req.user.id } },
          },
          { new: true }
        )
      : null;

  if (!pickup) {
    const existing = await Pickup.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Pickup not found");
    if (String(existing.collector) !== String(req.user.id)) {
      throw new ApiError(403, "You are not assigned to this pickup");
    }
    throw new ApiError(400, `Cannot move from ${existing.status} to ${nextStatus}`);
  }

  if (nextStatus === "completed") {
    try {
      await Transaction.create({
        collector: pickup.collector,
        pickup: pickup._id,
        type: "earning",
        amount: pickup.price,
      });
    } catch (err) {
      // Unique index on (pickup, type) means a duplicate here is a retried
      // request for a pickup already credited — not a real error, so the
      // pickup status update above still stands. Anything else, surface it.
      if (err.code !== 11000) throw err;
    }
  }

  req.io.emit("updatePickup", pickup);

  await notifyUser(req.io, pickup.user, {
    type: "status_update",
    text: `Your ${pickup.scrapType} pickup was ${STATUS_LABELS[nextStatus] || nextStatus}`,
    pickupId: pickup._id,
  });

  if (nextStatus === "completed") {
    // Fire-and-forget, same reasoning as acceptPickup's own call — a
    // completion just moved completedCount and completionRate, either of
    // which could newly cross a badge threshold.
    syncCollectorBadges(req.io, pickup.collector).catch((err) =>
      console.error("Badge sync after completion failed:", err.message)
    );

    // Checked for both parties on this pickup, not just the collector —
    // this same completion event could be either person's first-ever
    // pickup, and either one could be the referee half of a pending
    // Referral (see activateReferralIfEligible's own comment on why the
    // check differs by role). Fire-and-forget for the same reason as
    // every other post-completion side effect here: a missed referral
    // activation should never threaten the completion itself.
    activateReferralIfEligible(req.io, pickup.collector).catch((err) =>
      console.error("Referral activation (collector) failed:", err.message)
    );
    activateReferralIfEligible(req.io, pickup.user).catch((err) =>
      console.error("Referral activation (requester) failed:", err.message)
    );
  }

  res.json(pickup);
});