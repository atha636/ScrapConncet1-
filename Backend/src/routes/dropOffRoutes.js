const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");
const { getPendingDropOffs, recordDropOff } = require("../controllers/dropOffController");

router.get("/pending", auth, role("collector"), getPendingDropOffs);
router.post("/", auth, role("collector"), upload.single("photo"), recordDropOff);

module.exports = router;