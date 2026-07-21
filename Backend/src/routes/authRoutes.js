const router = require("express").Router();
const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authValidator");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", auth, me);
router.patch("/me", auth, validate(updateProfileSchema), updateProfile);
router.patch("/change-password", auth, validate(changePasswordSchema), changePassword);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", auth, resendVerification);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

module.exports = router;