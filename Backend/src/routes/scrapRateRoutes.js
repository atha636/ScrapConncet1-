const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { getRates, getHistory, updateRate } = require("../controllers/scrapRateController");

// Public — no auth. This is the page anyone can open to check today's
// per-kg rates before requesting a pickup.
router.get("/", getRates);

// Public — rate change history for the trend chart.
router.get("/history", getHistory);

// Admin only — editing the rates themselves.
router.put("/:scrapType", auth, role("admin"), updateRate);

module.exports = router;