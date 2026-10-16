const { z } = require("zod");
const { UPI_ID_PATTERN } = require("../utils/upi");

const saveUpiSchema = z.object({
  upiId: z.string().trim().regex(UPI_ID_PATTERN, "Enter a valid UPI ID, like name@upi"),
});

const claimSchema = z.object({
  method: z.enum(["upi", "cash"]),
  // The 12-digit UTR / transaction id shown in the UPI app. Optional but
  // useful if the requester later says they never received it.
  upiRef: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{6,40}$/, "Reference should be 6–40 letters or digits")
    .optional(),
});

const disputeSchema = z.object({
  description: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

module.exports = { saveUpiSchema, claimSchema, disputeSchema };