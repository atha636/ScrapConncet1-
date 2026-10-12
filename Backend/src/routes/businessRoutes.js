const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { businessProfileSchema } = require("../validators/businessValidator");
const c = require("../controllers/businessController");

router.get("/profile", auth, role("user"), c.getProfile);
router.put("/profile", auth, role("user"), validate(businessProfileSchema), c.saveProfile);

router.get("/report", auth, role("user"), c.getReport);
router.get("/report/csv", auth, role("user"), c.getReportCsv);

module.exports = router;