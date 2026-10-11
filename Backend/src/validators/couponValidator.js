const { z } = require("zod");

const codeField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3,20}$/, "Code must be 3-20 letters or numbers");

const nullableInt = (min) => z.number().int().min(min).nullable().optional();

const base = z.object({
  code: codeField,
  description: z.string().trim().max(140).optional(),
  type: z.enum(["percent", "flat"]),
  value: z.number().min(1),
  maxBonus: nullableInt(1),
  minOrderValue: z.number().min(0).optional(),
  firstPickupOnly: z.boolean().optional(),
  maxRedemptions: nullableInt(1),
  perUserLimit: z.number().int().min(1).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

const createCouponSchema = base.refine((d) => d.type !== "percent" || d.value <= 100, {
  message: "A percent coupon can't be above 100",
  path: ["value"],
});

// Admins can switch a coupon off/on or extend it; the discount itself is
// fixed once created so past receipts stay explainable.
const updateCouponSchema = z.object({
  active: z.boolean().optional(),
  description: z.string().trim().max(140).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  maxRedemptions: nullableInt(1),
});

const validateCouponSchema = z.object({
  code: codeField,
  estimatedPrice: z.number().min(0).optional(),
});

module.exports = { createCouponSchema, updateCouponSchema, validateCouponSchema, codeField };