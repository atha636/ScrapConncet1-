const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const uploadKyc = require("../middleware/uploadKyc");
const {
  getMyVerification,
  submitVerification,
  listVerifications,
  getVerificationDocument,
  reviewVerification,
} = require("../controllers/verificationController");

// Collector — their own status and submission
router.get("/me", auth, role("collector"), getMyVerification);
router.post("/submit", auth, role("collector"), uploadKyc.single("document"), submitVerification);

// Admin — review queue
router.get("/admin", auth, role("admin"), listVerifications);
router.get("/admin/:id/document", auth, role("admin"), getVerificationDocument);
router.patch("/admin/:id/review", auth, role("admin"), reviewVerification);

module.exports = router;