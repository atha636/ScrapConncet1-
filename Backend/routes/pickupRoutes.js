const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const {
  createPickup,
  getMyRequests,
  getAvailable,
  acceptPickup,
  updateStatus
} = require("../controllers/pickupController");

router.post("/request", auth, upload.single("image"), createPickup);
router.get("/my-requests", auth, getMyRequests);

router.get("/available", auth, role("collector"), getAvailable);
router.patch("/:id/accept", auth, role("collector"), acceptPickup);
router.patch("/:id/status", auth, role("collector"), updateStatus);

module.exports = router;