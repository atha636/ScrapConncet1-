const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const PayoutRequest = require("../models/PayoutRequest");

// The one place "how much can this collector actually withdraw right now"
// gets computed — used both when a collector submits a request and again
// when an admin approves one (a second check, since balance may have moved
// between the two). Never duplicate this formula elsewhere.
//
// available = all-time earnings - already paid out - currently pending
// requests (pending amounts are reserved so two simultaneous requests can't
// both draw against the same money before either is approved).
//
// excludeRequestId: pass the PayoutRequest currently being approved so its
// own reservation isn't subtracted from itself — otherwise this function
// would always report the amount as unavailable at the exact moment it's
// being approved, since the request is still "pending" until the approval
// finishes.
async function getAvailableBalance(collectorId, excludeRequestId = null) {
  const id = new mongoose.Types.ObjectId(collectorId);

  const pendingMatch = { collector: id, status: "pending" };
  if (excludeRequestId) pendingMatch._id = { $ne: excludeRequestId };

  const [earningsAgg, payoutsAgg, pendingAgg] = await Promise.all([
    // "earning" and "referral_bonus" are both credits into the wallet —
    // grouped together here so a referral bonus is real, withdrawable
    // money, not a number that only shows up somewhere cosmetic. Kept as
    // two distinct transaction types rather than merging them at write
    // time so getSummary's own pickup-earnings figures (a collector's
    // "how much have you earned from jobs" stat) can stay scoped to
    // "earning" alone — see that function's own comment on why mixing
    // transaction kinds there would misrepresent what's being shown.
    Transaction.aggregate([
      { $match: { collector: id, type: { $in: ["earning", "referral_bonus"] } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { collector: id, type: "payout" } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    PayoutRequest.aggregate([
      { $match: pendingMatch },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
  ]);

  const totalEarned = earningsAgg[0]?.sum || 0;
  const totalPaidOut = payoutsAgg[0]?.sum || 0;
  const totalPending = pendingAgg[0]?.sum || 0;

  return {
    totalEarned,
    totalPaidOut,
    totalPending,
    available: totalEarned - totalPaidOut - totalPending,
  };
}

module.exports = { getAvailableBalance };