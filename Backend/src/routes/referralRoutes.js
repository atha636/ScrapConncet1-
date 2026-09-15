const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const { getMyReferrals, validateReferralCode } = require("../controllers/referralController");

router.get("/me", auth, getMyReferrals);

// No auth — same reasoning as pickupRoutes' /collector/:id/profile/public:
// this is a per-code lookup reachable by anyone typing or pasting a URL,
// with no login step that would otherwise throttle scripted enumeration
// for free. Same 60/15min ceiling as that route.
const validateCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many requests, please slow down" },
});
router.get("/validate/:code", validateCodeLimiter, validateReferralCode);

module.exports = router;