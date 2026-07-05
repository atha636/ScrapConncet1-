const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getStats,
  getUsers,
  deactivateUser,
  activateUser,
  getAllPickups,
} = require("../controllers/adminController");

// Every route here requires an authenticated admin — enforced per-route
// (not just at the router level) so each stays explicit and self-contained.
router.get("/stats", auth, role("admin"), getStats);
router.get("/users", auth, role("admin"), getUsers);
router.patch("/users/:id/deactivate", auth, role("admin"), deactivateUser);
router.patch("/users/:id/activate", auth, role("admin"), activateUser);
router.get("/pickups", auth, role("admin"), getAllPickups);

module.exports = router;