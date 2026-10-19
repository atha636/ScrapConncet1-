const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { reviewSchema } = require("../validators/fraudValidator");
const c = require("../controllers/fraudController");

// Admin only. Read-only watch list plus an "I've reviewed this" mark.
router.get("/flags", auth, role("admin"), c.getFlags);
router.post("/flags/review", auth, role("admin"), validate(reviewSchema), c.reviewFlag);

module.exports = router;