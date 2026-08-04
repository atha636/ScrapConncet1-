const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const PayoutRequest = require("../models/PayoutRequest");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getAvailableBalance } = require("../utils/walletBalance");
const { MIN_PAYOUT_AMOUNT } = require("../utils/payoutRules");

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/wallet/summary  (collector only)
// Every figure here is derived live from the ledger via aggregation — there
// is no `balance` field anywhere to fall out of sync with reality.
exports.getSummary = asyncHandler(async (req, res) => {
  const collectorId = new mongoose.Types.ObjectId(req.user.id);
  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
  const startOfMonth = new Date(now.getTime() - 30 * DAY_MS);

  const [totals, balance] = await Promise.all([
    Transaction.aggregate([
      // Scoped to "earning" only — this summary is "how much have you
      // earned," not a raw sum of every ledger entry. A payout entry mixed
      // into these buckets would silently inflate the earned total instead
      // of representing money that left.
      { $match: { collector: collectorId, type: "earning" } },
      {
        $facet: {
          allTime: [{ $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } }],
          last7Days: [
            { $match: { createdAt: { $gte: startOfWeek } } },
            { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
          ],
          last30Days: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
          ],
        },
      },
    ]),
    getAvailableBalance(req.user.id),
  ]);

  const pick = (bucket) => ({
    totalEarned: bucket?.[0]?.sum || 0,
    pickupsCompleted: bucket?.[0]?.count || 0,
  });

  res.json({
    allTime: pick(totals[0].allTime),
    last7Days: pick(totals[0].last7Days),
    last30Days: pick(totals[0].last30Days),
    balance,
  });
});

// GET /api/wallet/trend  (collector only)
// Daily earnings for the last 30 days — same day-filling pattern as the
// admin analytics series, so a quiet day shows as a real dip to zero
// instead of just vanishing from the chart.
exports.getEarningsTrend = asyncHandler(async (req, res) => {
  const days = 30;
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const collectorId = new mongoose.Types.ObjectId(req.user.id);

  const earningsAgg = await Transaction.aggregate([
    { $match: { collector: collectorId, type: "earning", createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        earned: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const byDay = Object.fromEntries(earningsAgg.map((d) => [d._id, d]));

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      earned: byDay[key]?.earned || 0,
      count: byDay[key]?.count || 0,
    });
  }

  res.json({ series });
});

// GET /api/wallet/transactions  (collector only)
exports.getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Transaction.find({ collector: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("pickup", "scrapType estimatedWeightKg location.address"),
    Transaction.countDocuments({ collector: req.user.id }),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// POST /api/wallet/payout  (collector only)
exports.requestPayout = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount < MIN_PAYOUT_AMOUNT) {
    throw new ApiError(400, `Minimum payout amount is ₹${MIN_PAYOUT_AMOUNT}`);
  }

  // One pending request at a time — otherwise a collector could fire off
  // several requests summing to more than their actual balance before any
  // of them get reviewed, since "pending" amounts are only reserved against
  // the balance individually, not checked against each other cumulatively
  // beyond this guard.
  const existingPending = await PayoutRequest.findOne({ collector: req.user.id, status: "pending" });
  if (existingPending) {
    throw new ApiError(409, "You already have a pending payout request.");
  }

  const { available } = await getAvailableBalance(req.user.id);
  if (amount > available) {
    throw new ApiError(400, `You can withdraw up to ₹${available} right now.`);
  }

  const request = await PayoutRequest.create({ collector: req.user.id, amount });
  res.status(201).json(request);
});

// GET /api/wallet/payouts  (collector only) — the requesting collector's own history
exports.getMyPayouts = asyncHandler(async (req, res) => {
  const requests = await PayoutRequest.find({ collector: req.user.id }).sort({ createdAt: -1 }).limit(50);
  res.json(requests);
});