const { z } = require("zod");

// NOTE: role is intentionally NOT accepted here. Registering as "collector"
// is a separate, explicit action (see collectorSignupSchema) — never a field
// a client can freely set on a generic register call.
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

module.exports = { registerSchema, loginSchema };
