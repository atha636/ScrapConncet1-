const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { sosSchema, resolveSchema } = require("../validators/safetyValidator");
const c = require("../controllers/safetyController");

// No login on this one — it's what a shared trip link opens. The token is
// unguessable, and the limiter stops anyone hammering the endpoint to scan.
const publicTripLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 240, // a viewer polling every 15s needs ~60 per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many requests, please slow down" },
});
router.get("/public/trip/:token", publicTripLimiter, c.getPublicTrip);

// Requester or collector on the pickup
router.get("/pickups/:id/share", auth, role("user", "collector"), c.getShare);
router.post("/pickups/:id/share", auth, role("user", "collector"), c.createShare);
router.delete("/pickups/:id/share", auth, role("user", "collector"), c.revokeShare);
router.post("/pickups/:id/sos", auth, role("user", "collector"), validate(sosSchema), c.raiseSos);

// Admin
router.get("/admin/alerts", auth, role("admin"), c.adminList);
router.patch("/admin/alerts/:id/resolve", auth, role("admin"), validate(resolveSchema), c.adminResolve);

module.exports = router;