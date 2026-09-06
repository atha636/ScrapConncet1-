const router = require("express").Router();
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
const { getLeaderboard } = require("../controllers/collectorStatsController");
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
router.patch("/:id/accept", auth, role("collector"), acceptPickup);
router.patch(
  "/:id/status",
  auth,
  role("collector"),
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