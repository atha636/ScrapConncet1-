const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { subscribeSchema, settingsSchema, grantSchema } = require("../validators/planValidator");
const c = require("../controllers/planController");

router.get("/", auth, role("collector"), c.getPlans);
router.post("/subscribe", auth, role("collector"), validate(subscribeSchema), c.subscribe);

router.get("/admin", auth, role("admin"), c.adminOverview);
router.put("/admin/settings", auth, role("admin"), validate(settingsSchema), c.adminSaveSettings);
router.post("/admin/grant", auth, role("admin"), validate(grantSchema), c.adminGrant);

module.exports = router;