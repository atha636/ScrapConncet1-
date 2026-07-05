const router = require("express").Router();
const { register, login, me, updateProfile, changePassword } = require("../controllers/authController");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require("../validators/authValidator");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", auth, me);
router.patch("/me", auth, validate(updateProfileSchema), updateProfile);
router.patch("/change-password", auth, validate(changePasswordSchema), changePassword);

module.exports = router;