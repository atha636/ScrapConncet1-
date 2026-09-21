const { z } = require("zod");
const { MIN_PAYOUT_AMOUNT } = require("../utils/payoutRules");

const requestPayoutSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform(Number).pipe(
    z.number().min(MIN_PAYOUT_AMOUNT, `Minimum payout amount is ₹${MIN_PAYOUT_AMOUNT}`)
  ),
});

// A real (if loose) UPI handle shape — "name@bank" — mainly to catch a
// plain typo (a phone number, an email, an empty string past trim)
// before it reaches an admin who'd otherwise be the one to discover the
// mistake while trying to actually send money.
const UPI_ID_PATTERN = /^[\w.+-]{2,}@[a-zA-Z]{2,}$/;
// 9–18 digits covers every Indian bank account number in practice —
// intentionally loose since the real validation of "does this account
// exist" can only happen when the admin actually sends the transfer, not
// here.
const BANK_ACCOUNT_PATTERN = /^\d{9,18}$/;
// Standard RFC-format IFSC: 4 letters (bank code) + 0 + 6 alphanumeric
// (branch code).
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// PATCH /api/wallet/payout-details (collector only)
//
// One object with a `method` discriminator rather than two separate
// schemas, since a collector only ever has one payout method on file at
// a time (see User.payoutDetails) — switching from UPI to bank details
// replaces the old method entirely rather than the two coexisting.
const updatePayoutDetailsSchema = z
  .object({
    method: z.enum(["upi", "bank"]),
    upiId: z.string().trim().max(80).optional(),
    bankAccountNumber: z.string().trim().max(30).optional(),
    bankIfsc: z.string().trim().max(11).optional(),
    bankAccountHolder: z.string().trim().max(60).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "upi") {
      if (!data.upiId || !UPI_ID_PATTERN.test(data.upiId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["upiId"], message: "Enter a valid UPI ID (e.g. name@bank)" });
      }
      return;
    }
    // method === "bank"
    if (!data.bankAccountNumber || !BANK_ACCOUNT_PATTERN.test(data.bankAccountNumber)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "Enter a valid account number" });
    }
    if (!data.bankIfsc || !IFSC_PATTERN.test(data.bankIfsc.toUpperCase())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankIfsc"], message: "Enter a valid IFSC code" });
    }
    if (!data.bankAccountHolder || data.bankAccountHolder.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountHolder"], message: "Enter the account holder's name" });
    }
  });

module.exports = { requestPayoutSchema, updatePayoutDetailsSchema };