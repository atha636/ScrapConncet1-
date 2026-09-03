const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { createPickupSchema, updateStatusSchema } = require("../validators/pickupValidator");
const { createDisputeSchema } = require("../validators/disputeValidator");

const {
  createPickup,
  getMyRequests,
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
  cancelByRequester,
} = require("../controllers/pickupController");
const { createDispute } = require("../controllers/disputeController");

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

router.get("/available", auth, role("collector"), getAvailable);
router.get("/collector/jobs", auth, role("collector"), getCollectorJobs);
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

module.exports = router;