const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");
const uploadMemory = require("../middleware/uploadMemory");
const validate = require("../middleware/validate");
const {
  createPickupSchema,
  updateStatusSchema,
  batchAcceptSchema,
  updateAvailabilitySchema,
  proposeOfferSchema,
  respondOfferSchema,
  inviteCollectorSchema,
  reportNoShowSchema,
} = require("../validators/pickupValidator");
const { getMyAvailability, updateMyAvailability } = require("../controllers/availabilityController");
const { createDisputeSchema } = require("../validators/disputeValidator");
const { createRecurringSchema } = require("../validators/recurringPickupValidator");

const {
  createPickup,
  estimateFromPhoto,
  getMyRequests,
  getAvailable,
  getCollectorJobs,
  getCollectorRoute,
  getSuggestedBatch,
  getDemandHeatmap,
  acceptPickup,
  batchAcceptPickups,
  updateStatus,
  cancelByRequester,
  getPickupById,
  proposeOffer,
  respondToOffer,
  getNearbyCollectors,
  inviteCollector,
  getMyInvites,
  reportNoShow,
} = require("../controllers/pickupController");
const { createDispute, getPickupDisputes } = require("../controllers/disputeController");
const {
  getLeaderboard,
  getCollectorProfile,
  getPublicCollectorProfile,
  getCollectorReviews,
  getMyAchievements,
  getPerformanceInsights,
} = require("../controllers/collectorStatsController");
const { getRequesterProfile, getMyReputation } = require("../controllers/requesterStatsController");
const {
  createRecurring,
  getMyRecurring,
  toggleRecurring,
  deleteRecurring,
} = require("../controllers/recurringPickupController");

// A real API call per hit (see utils/scrapEstimator.js), unlike almost
// everything else in this file — its own, much tighter limiter than the
// app-wide apiLimiter (see app.js), scoped per logged-in user rather than
// per IP like the public-route limiters elsewhere in this file, since the
// concern here is cost per account, not anonymous scripted abuse.
const photoEstimateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: "Too many photo estimates — try again in a few minutes." },
});

router.post(
  "/estimate-from-photo",
  auth,
  role("user"),
  photoEstimateLimiter,
  uploadMemory.single("image"),
  estimateFromPhoto
);

router.post(
  "/request",
  auth,
  role("user"),
  upload.single("image"),
  validate(createPickupSchema),
  createPickup
);

router.get("/my-requests", auth, role("user"), getMyRequests);
router.patch("/:id/cancel", auth, role("user"), cancelByRequester);
router.post("/:id/report-no-show", auth, role("user"), validate(reportNoShowSchema), reportNoShow);

// "Repeat this pickup" — a requester-only template that a cron job (see
// jobs/spawnRecurringPickups.js) turns into a real Pickup on schedule.
// Static paths ("/recurring", "/recurring/:id/...") never collide with the
// "/:id/..." param routes elsewhere in this file, since Express only
// matches "/:id" against the literal segment "recurring" — order between
// them doesn't matter here, but grouped together for readability.
router.post("/recurring", auth, role("user"), validate(createRecurringSchema), createRecurring);
router.get("/recurring", auth, role("user"), getMyRecurring);
router.patch("/recurring/:id/toggle", auth, role("user"), toggleRecurring);
router.delete("/recurring/:id", auth, role("user"), deleteRecurring);

router.get("/available", auth, role("collector"), getAvailable);
router.get("/collector/jobs", auth, role("collector"), getCollectorJobs);
router.get("/collector/route", auth, role("collector"), getCollectorRoute);

// Suggests a tight, nearby cluster of *pending* (unaccepted) pickups the
// collector could accept in one go, ordered into a driveable sequence —
// distinct from /collector/route above, which only ever orders jobs this
// collector has already accepted. Same literal-segment reasoning as the
// other /collector/* routes in this file: "suggested-batch" can't collide
// with "/:id/..." regardless of declaration order.
router.get("/collector/suggested-batch", auth, role("collector"), getSuggestedBatch);

// Coarse, privacy-binned view of where pending demand is clustering near
// the collector — see the controller's own comment for why this is a
// different question from suggested-batch/available.
router.get("/collector/demand-heatmap", auth, role("collector"), getDemandHeatmap);
router.get("/collector/leaderboard", auth, role("collector"), getLeaderboard);
router.get("/collector/achievements", auth, role("collector"), getMyAchievements);

// Week-over-week trend and busiest-day/hour pattern — see the
// controller's own comment for why this is additive rather than
// overlapping with wallet's getSummary or achievements' badge progress.
router.get("/collector/performance", auth, role("collector"), getPerformanceInsights);

// Any authenticated user (not collector-only, unlike the routes above) —
// this is what a requester sees about the collector on their own pickup.
// 3 path segments, so it can't collide with the 2-segment "/collector/jobs"
// or "/collector/leaderboard" above regardless of declaration order.
router.get("/collector/:id/profile", auth, getCollectorProfile);

// No `auth` — this is the endpoint behind a collector's share link, meant
// to work for a logged-out visitor. Declared as a literal "/public" suffix
// after the route above so it can never be swallowed by "/:id" segments
// elsewhere in this file. Tighter than the app-wide apiLimiter (see
// app.js): every other per-id lookup in the API requires a login first,
// which already throttles scripted enumeration on its own — this one
// doesn't get that for free, so it needs its own ceiling.
const publicProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many requests, please slow down" },
});
router.get("/collector/:id/profile/public", publicProfileLimiter, getPublicCollectorProfile);

// Same no-auth reasoning as /profile/public above, but its own limiter
// rather than sharing publicProfileLimiter's instance — this one is meant
// to be paged through (10+ requests to read a full review history is
// normal use, not abuse), so it needs a higher ceiling than a single
// profile-page load does.
const collectorReviewsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many requests, please slow down" },
});
router.get("/collector/:id/reviews", collectorReviewsLimiter, getCollectorReviews);

// The mirror image of the collector routes above — what a collector sees
// about a requester, not the other way around. Auth only, no public
// variant: unlike a collector's profile, there's no "share this outside
// the app" use case for a requester's own stats, so this doesn't need the
// rate-limiter/public-endpoint machinery the collector routes above do.
router.get("/requester/:id/profile", auth, getRequesterProfile);

// Self-only — the requester's own "My Reputation" panel (see Profile.jsx).
// Third segment is "reputation", not "profile", so this never collides
// with the :id route above no matter the declaration order (see this
// handler's own comment in requesterStatsController.js for why that
// matters).
router.get("/requester/me/reputation", auth, role("user"), getMyReputation);

router.patch(
  "/:id/accept",
  auth,
  role("collector"),
  acceptPickup
);

// Distinct literal second segment ("batch-accept") from "/:id/accept"
// above ("accept") — the two can never collide regardless of declaration
// order, the same non-collision reasoning used throughout this file for
// the /collector/* routes.
router.patch("/collector/batch-accept", auth, role("collector"), validate(batchAcceptSchema), batchAcceptPickups);

// Price negotiation — proposeOffer opens/reopens a negotiation
// (collector-only, since a requester never needs to "open" one on their
// own pickup), respondToOffer is used by either side to accept, decline,
// or counter whichever offer is currently theirs to respond to (role and
// turn are both derived server-side in the controller, not trusted from
// the request). Same literal-segment reasoning as batch-accept above:
// "offer" never collides with "/:id/accept" or "/:id/status".
router.post("/:id/offer", auth, role("collector"), validate(proposeOfferSchema), proposeOffer);
router.patch("/:id/offer", auth, role("user", "collector"), validate(respondOfferSchema), respondToOffer);

// Pick-your-collector — the requester-initiated counterpart to the
// collector-initiated negotiation above. getNearbyCollectors is read-only
// browsing (own pickup only, enforced in the controller); inviteCollector
// opens a negotiation the same way proposeOffer does, just from the other
// side — the invited collector then resolves it through the exact same
// respondToOffer/OfferPanel flow with no separate acceptance path of its
// own. Same literal-segment reasoning as "offer" above: neither
// "nearby-collectors" nor "invite" can collide with any other /:id/*
// route in this file.
router.get("/:id/nearby-collectors", auth, role("user"), getNearbyCollectors);
router.post("/:id/invite", auth, role("user"), validate(inviteCollectorSchema), inviteCollector);

// Always-checkable list of negotiations (including invites) this
// collector is currently part of — see the controller's own comment for
// why this can't just be folded into getAvailable or getCollectorJobs.
router.get("/collector/my-invites", auth, role("collector"), getMyInvites);

// Self-only — a collector's own working-hours/pause settings, checked by
// acceptPickup and batchAcceptPickups above (see
// utils/collectorAvailability.js). Same 2-segment literal shape as
// /collector/jobs, /collector/leaderboard, /collector/achievements — no
// collision risk with the /:id/* routes for the same reason those don't
// collide either.
router.get("/collector/availability", auth, role("collector"), getMyAvailability);
router.patch(
  "/collector/availability",
  auth,
  role("collector"),
  validate(updateAvailabilitySchema),
  updateMyAvailability
);
router.patch(
  "/:id/status",
  auth,
  role("collector"),
  // Multer inspects Content-Type and simply calls next() untouched for a
  // plain JSON request — this doesn't change behavior for the common
  // accepted/in_progress transitions, which still send a normal JSON body
  // with no file. Only a "completed" transition needs to actually attach
  // a photo (see updateStatus's own check for that requirement).
  upload.single("photo"),
  validate(updateStatusSchema),
  updateStatus
);

// Either party to the pickup can file a dispute — not restricted to a
// single role the way most other routes here are.
router.post(
  "/:id/dispute",
  auth,
  role("user", "collector"),
  validate(createDisputeSchema),
  createDispute
);

// Read side of the same feature — either party can check what's
// happened to a report they filed or were named in, not just file one.
router.get("/:id/disputes", auth, role("user", "collector"), getPickupDisputes);

// Deliberately declared LAST among this file's GET routes — Express
// matches routes in declaration order, not by specificity, so a bare
// "/:id" declared any earlier would shadow every literal GET path above it
// (a request to GET /my-requests would incorrectly match here with
// id="my-requests" instead of ever reaching the real handler).
router.get("/:id", auth, getPickupById);

module.exports = router;