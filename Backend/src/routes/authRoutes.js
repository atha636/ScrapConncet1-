const router = require("express").Router();
const { register, login, me } = require("../controllers/authController");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const { registerSchema, loginSchema } = require("../validators/authValidator");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", auth, me);

module.exports = router;
