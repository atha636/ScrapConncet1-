const { z } = require("zod");

const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

const partnerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().max(200).optional().default(""),
  accepts: z.array(z.enum(SCRAP_TYPES)).max(6).default([]),
  isActive: z.boolean().optional().default(true),
});

module.exports = { partnerSchema };