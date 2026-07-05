const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { createPickupSchema, updateStatusSchema } = require("../validators/pickupValidator");

const {
  createPickup,
  getMyRequests,
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
  cancelByRequester,
} = require("../controllers/pickupController");

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

module.exports = router;