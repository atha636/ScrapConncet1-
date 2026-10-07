const { z } = require("zod");

const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

const compareQuotesSchema = z
  .object({
    materials: z
      .array(
        z.object({
          scrapType: z.enum(SCRAP_TYPES),
          weightKg: z.number().positive().max(5000),
        })
      )
      .max(6)
      .default([]),
    countItems: z
      .array(
        z.object({
          key: z.string().min(1).max(40),
          qty: z.number().int().min(1).max(50),
        })
      )
      .max(12)
      .default([]),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .refine((v) => v.materials.length + v.countItems.length > 0, {
    message: "Add at least one item",
  });

// Each type is a rate in ₹/kg, or null to go back to the platform rate.
const rateCardSchema = z.object({
  rates: z.record(z.enum(SCRAP_TYPES), z.number().min(1).max(1000).nullable()),
});

const updateCatalogItemSchema = z.object({
  valueEach: z.number().min(0).max(100000),
  weightKgEach: z.number().min(0.01).max(2000),
  isActive: z.boolean(),
});

module.exports = { compareQuotesSchema, rateCardSchema, updateCatalogItemSchema };