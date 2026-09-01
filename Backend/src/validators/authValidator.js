const { z } = require("zod");
const { SCRAP_TYPES } = require("../models/Pickup");

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
  // Only meaningful for a collector account — the controller silently
  // ignores this for any other role rather than erroring, since a generic
  // profile-update call shouldn't need to know the caller's role up front.
  collectorPreferences: z
    .object({
      // Empty array is a valid, deliberate choice ("no type filter" — see
      // all scrap types), so it's kept distinct from omitting the field
      // entirely (which leaves the existing preference untouched).
      scrapTypes: z.array(z.enum(SCRAP_TYPES)).max(SCRAP_TYPES.length).optional(),
      radiusKm: z.number().min(1).max(100).optional(),
    })
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Za-z]/, "New password must contain a letter")
    .regex(/[0-9]/, "New password must contain a number"),
});

// password is optional here because a Google-only account has none to check —
// the controller decides whether it's actually required based on the account
// itself. `confirm` is a belt-and-suspenders check so this can never be hit
// by an accidental/malformed request; the real "are you sure" UX lives in the
// frontend's warning modal.
const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirm: z.literal("DELETE", {
    errorMap: () => ({ message: 'Type "DELETE" to confirm.' }),
  }),
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
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};