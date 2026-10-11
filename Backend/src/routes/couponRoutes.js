const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { createCouponSchema, updateCouponSchema, validateCouponSchema } = require("../validators/couponValidator");
const c = require("../controllers/couponController");

router.post("/validate", auth, role("user"), validate(validateCouponSchema), c.validateCode);

router.get("/admin", auth, role("admin"), c.adminList);
router.post("/admin", auth, role("admin"), validate(createCouponSchema), c.adminCreate);
router.patch("/admin/:id", auth, role("admin"), validate(updateCouponSchema), c.adminUpdate);

module.exports = router;