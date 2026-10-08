const router = require("express").Router();
const auth = require("../middleware/auth");
const { getReceipt } = require("../controllers/receiptController");

// Either party to the pickup; the controller checks which.
router.get("/:id/receipt", auth, getReceipt);

module.exports = router;