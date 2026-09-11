const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { createPickupSchema, updateStatusSchema } = require("../validators/pickupValidator");
const { createDisputeSchema } = require("../validators/disputeValidator");
const { createRecurringSchema } = require("../validators/recurringPickupValidator");

const {
  createPickup,
  getMyRequests,
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
  cancelByRequester,
  getPickupById,
} = require("../controllers/pickupController");
const { createDispute } = require("../controllers/disputeController");
const {
  getLeaderboard,
  getCollectorProfile,
  getPublicCollectorProfile,
  getCollectorReviews,
} = require("../controllers/collectorStatsController");
const {
  createRecurring,
  getMyRecurring,
  toggleRecurring,
  deleteRecurring,
} = require("../controllers/recurringPickupController");

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
router.get("/collector/leaderboard", auth, role("collector"), getLeaderboard);

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

router.patch(
  "/:id/accept",
  auth,
  role("collector"),
  acceptPickup
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

// Deliberately declared LAST among this file's GET routes — Express
// matches routes in declaration order, not by specificity, so a bare
// "/:id" declared any earlier would shadow every literal GET path above it
// (a request to GET /my-requests would incorrectly match here with
// id="my-requests" instead of ever reaching the real handler).
router.get("/:id", auth, getPickupById);

module.exports = router;