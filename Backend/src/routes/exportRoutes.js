const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  exportMyRequests,
  exportUsers,
  exportAdminPickups,
} = require("../controllers/exportController");

router.get("/my-requests", auth, role("user"), exportMyRequests);
router.get("/admin/users", auth, role("admin"), exportUsers);
router.get("/admin/pickups", auth, role("admin"), exportAdminPickups);

module.exports = router;