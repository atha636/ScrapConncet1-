const { z } = require("zod");

const PAID = ["pro", "elite"];

const subscribeSchema = z.object({ planKey: z.enum(PAID) });

const settingsSchema = z.object({
  commissionEnabled: z.boolean(),
  plans: z
    .array(
      z.object({
        key: z.enum(["free", "pro", "elite"]),
        name: z.string().trim().min(2).max(30),
        priceMonthly: z.number().min(0).max(100000),
        commissionPct: z.number().min(0).max(30),
      })
    )
    .length(3, "Send all three plans"),
});

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  planKey: z.enum(PAID),
  days: z.number().int().min(1).max(366).optional(),
  amountPaid: z.number().min(0).max(100000),
  reference: z.string().trim().max(80).optional(),
});

module.exports = { subscribeSchema, settingsSchema, grantSchema };