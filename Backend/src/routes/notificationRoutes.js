const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getNotifications,
  markRead,
  markAllRead,
} = require("../controllers/notificationController");

router.get("/", auth, getNotifications);
router.patch("/read-all", auth, markAllRead);
router.patch("/:id/read", auth, markRead);

module.exports = router;