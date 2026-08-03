const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getStats,
  getAnalytics,
  getUsers,
  deactivateUser,
  activateUser,
  reinstateCollector,
  getPayoutRequests,
  approvePayout,
  rejectPayout,
  getAllPickups,
} = require("../controllers/adminController");

// Every route here requires an authenticated admin — enforced per-route
// (not just at the router level) so each stays explicit and self-contained.
router.get("/stats", auth, role("admin"), getStats);
router.get("/analytics", auth, role("admin"), getAnalytics);
router.get("/users", auth, role("admin"), getUsers);
router.patch("/users/:id/deactivate", auth, role("admin"), deactivateUser);
router.patch("/users/:id/activate", auth, role("admin"), activateUser);
router.patch("/users/:id/reinstate", auth, role("admin"), reinstateCollector);
router.get("/payouts", auth, role("admin"), getPayoutRequests);
router.patch("/payouts/:id/approve", auth, role("admin"), approvePayout);
router.patch("/payouts/:id/reject", auth, role("admin"), rejectPayout);
router.get("/pickups", auth, role("admin"), getAllPickups);

module.exports = router;