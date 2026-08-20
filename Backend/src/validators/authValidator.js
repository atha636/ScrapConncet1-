const { z } = require("zod");

// NOTE: role is intentionally NOT accepted here. Registering as "collector"
// is a separate, explicit action — never a field a client can freely set on
// a generic register call.
const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
  phone: z.string().trim().min(7).max(20).optional(),
  wantsToBeCollector: z.boolean().optional().default(false),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, "Google credential is required"),
  wantsToBeCollector: z.boolean().optional().default(false),
  // True once the frontend has actually collected a role choice for this
  // sign-in — Register always knows the role up front and sends this as
  // true immediately. Login doesn't know whether the Google account is
  // brand new, so it sends false on the first call; if the backend
  // determines it needs a role (see authController.googleAuth), the
  // frontend asks the person and resubmits with this set to true.
  roleChosen: z.boolean().optional().default(false),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: z.union([z.string().trim().min(7).max(20), z.literal("")]).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Za-z]/, "New password must contain a letter")
    .regex(/[0-9]/, "New password must contain a number"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Za-z]/, "New password must contain a letter")
    .regex(/[0-9]/, "New password must contain a number"),
});

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};