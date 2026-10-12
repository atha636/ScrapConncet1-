const { z } = require("zod");

const siteSchema = z.object({
  label: z.string().trim().min(2, "Give the site a name").max(60),
  address: z.string().trim().min(5, "Add the site address").max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const BUSINESS_TYPES = ["shop", "office", "school", "factory", "society", "other"];

const businessProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(80),
  businessType: z.enum(BUSINESS_TYPES),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters")
    .optional()
    .or(z.literal("")),
  sites: z.array(siteSchema).max(10, "Up to 10 sites").optional(),
});

module.exports = { businessProfileSchema, BUSINESS_TYPES };