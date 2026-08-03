const { z } = require("zod");
const { MIN_PAYOUT_AMOUNT } = require("../utils/payoutRules");

const requestPayoutSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform(Number).pipe(
    z.number().min(MIN_PAYOUT_AMOUNT, `Minimum payout amount is ₹${MIN_PAYOUT_AMOUNT}`)
  ),
});

module.exports = { requestPayoutSchema };