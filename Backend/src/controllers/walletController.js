const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../utils/asyncHandler");

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/wallet/summary  (collector only)
// Every figure here is derived live from the ledger via aggregation — there
// is no `balance` field anywhere to fall out of sync with reality.
exports.getSummary = asyncHandler(async (req, res) => {
  const collectorId = new mongoose.Types.ObjectId(req.user.id);
  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
  const startOfMonth = new Date(now.getTime() - 30 * DAY_MS);

  const [totals] = await Transaction.aggregate([
    { $match: { collector: collectorId } },
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
  ]);

  const pick = (bucket) => ({
    totalEarned: bucket?.[0]?.sum || 0,
    pickupsCompleted: bucket?.[0]?.count || 0,
  });

  res.json({
    allTime: pick(totals.allTime),
    last7Days: pick(totals.last7Days),
    last30Days: pick(totals.last30Days),
  });
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