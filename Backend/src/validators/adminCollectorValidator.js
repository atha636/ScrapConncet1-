const { z } = require("zod");

// Same password rules as registration (see authValidator.registerSchema).
const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

// Multipart form fields all arrive as strings — the document itself is
// handled by multer, not here.
const createCollectorSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20),
  password: passwordRule,
  idType: z.enum(["aadhaar", "driving_license", "voter_id", "pan"]),
  idLast4: z.string().regex(/^\d{4}$/, "Enter only the last 4 digits of the ID number"),
});

const resetCollectorPasswordSchema = z.object({
  password: passwordRule,
});

module.exports = { createCollectorSchema, resetCollectorPasswordSchema };