const router = require("express").Router();
const auth = require("../middleware/auth");
const { getMyImpact, getCommunityImpact } = require("../controllers/impactController");

// Public — totals for the Home page counter.
router.get("/community", getCommunityImpact);

// Logged-in — a person's own impact.
router.get("/me", auth, getMyImpact);

module.exports = router;