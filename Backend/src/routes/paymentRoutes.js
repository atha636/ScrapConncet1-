const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { saveUpiSchema, claimSchema, disputeSchema } = require("../validators/paymentValidator");
const c = require("../controllers/paymentController");

// The requester's own UPI ID (where collectors send the money)
router.get("/upi-id", auth, role("user"), c.getMyUpi);
router.put("/upi-id", auth, role("user"), validate(saveUpiSchema), c.saveMyUpi);
router.delete("/upi-id", auth, role("user"), c.clearMyUpi);

// Per-pickup payment
router.get("/pickups/:id", auth, role("user", "collector"), c.getPayment);
router.post("/pickups/:id/claim", auth, role("collector"), validate(claimSchema), c.claimPaid);
router.post("/pickups/:id/confirm", auth, role("user"), c.confirmReceived);
router.post("/pickups/:id/dispute", auth, role("user"), validate(disputeSchema), c.disputePayment);

module.exports = router;