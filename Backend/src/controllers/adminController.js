const User = require("../models/User");
const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const PayoutRequest = require("../models/PayoutRequest");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getAvailableBalance } = require("../utils/walletBalance");

const paginate = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// GET /api/admin/stats
exports.getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCollectors,
    totalPickups,
    pendingCount,
    activeCount,
    completedCount,
    cancelledCount,
    completedValueAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "collector" }),
    Pickup.countDocuments(),
    Pickup.countDocuments({ status: "pending" }),
    Pickup.countDocuments({ status: { $in: ["accepted", "in_progress"] } }),
    Pickup.countDocuments({ status: "completed" }),
    Pickup.countDocuments({ status: "cancelled" }),
    Pickup.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]),
  ]);

  res.json({
    totalUsers,
    totalCollectors,
    totalPickups,
    pendingCount,
    activeCount,
    completedCount,
    cancelledCount,
    totalValueMoved: completedValueAgg[0]?.total || 0,
  });
});

// GET /api/admin/analytics
// Time-series data for charts — daily pickup volume and daily revenue over
// the last 30 days. Missing days (no activity) are backfilled with zero
// rather than left out, so the chart doesn't silently skip gaps.
exports.getAnalytics = asyncHandler(async (req, res) => {
  const days = 30;
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [pickupsAgg, revenueAgg] = await Promise.all([
    Pickup.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Pickup.aggregate([
      { $match: { status: "completed" } },
      { $unwind: "$statusHistory" },
      {
        $match: {
          "statusHistory.status": "completed",
          "statusHistory.changedAt": { $gte: since },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$statusHistory.changedAt" } },
          revenue: { $sum: "$price" },
        },
      },
    ]),
  ]);

  const pickupsByDay = Object.fromEntries(pickupsAgg.map((d) => [d._id, d.count]));
  const revenueByDay = Object.fromEntries(revenueAgg.map((d) => [d._id, d.revenue]));

  // Build the full 30-day range so every day appears on the chart, even
  // ones with zero activity — otherwise a quiet day just vanishes instead
  // of showing as a dip, which is misleading at a glance.
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      pickups: pickupsByDay[key] || 0,
      revenue: revenueByDay[key] || 0,
    });
  }

  res.json({ series });
});

// GET /api/admin/users
exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const re = new RegExp(req.query.search.trim(), "i");
    filter.$or = [{ name: re }, { email: re }];
  }

  const [data, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/admin/users/:id/deactivate
exports.deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "admin") throw new ApiError(400, "Can't deactivate an admin account");

  user.isActive = false;
  await user.save();
  res.json(user);
});

// PATCH /api/admin/users/:id/activate
exports.activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  user.isActive = true;
  await user.save();
  res.json(user);
});

// PATCH /api/admin/users/:id/reinstate
// Lifts a rating-gate auto-suspension. Deliberately separate from
// activateUser/isActive — this is specifically the rating gate's flag, and
// is never cleared automatically even if the average later recovers, since
// a recovered number isn't the same as verified improved behavior.
exports.reinstateCollector = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (!user.collectorSuspended) throw new ApiError(400, "This collector isn't suspended");

  user.collectorSuspended = false;
  user.collectorSuspendedAt = null;
  await user.save();
  res.json(user);
});

// GET /api/admin/payouts
exports.getPayoutRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    PayoutRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("collector", "name email")
      .populate("processedBy", "name"),
    PayoutRequest.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/admin/payouts/:id/approve
// Creates the actual ledger debit — a pending request has no Transaction
// yet, only this step produces one. Re-checks the balance at approval time
// (not just at request time), since a collector's available balance could
// have moved since they asked. The unique index on Transaction.payoutRequest
// makes this safe to retry: a second approve attempt on an already-approved
// request hits that constraint and fails cleanly instead of double-debiting.
exports.approvePayout = asyncHandler(async (req, res) => {
  const request = await PayoutRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, "Payout request not found");
  if (request.status !== "pending") throw new ApiError(400, "This request has already been processed");

  const { available } = await getAvailableBalance(request.collector, request._id);
  if (request.amount > available) {
    throw new ApiError(400, "This collector's balance no longer covers this request");
  }

  try {
    await Transaction.create({
      collector: request.collector,
      type: "payout",
      amount: request.amount,
      payoutRequest: request._id,
    });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "This request was already approved");
    throw err;
  }

  request.status = "approved";
  request.processedAt = new Date();
  request.processedBy = req.user.id;
  await request.save();

  res.json(request);
});

// PATCH /api/admin/payouts/:id/reject
// No ledger entry is created or reversed — a rejected request never touched
// the Transaction collection in the first place, so there's nothing to undo.
exports.rejectPayout = asyncHandler(async (req, res) => {
  const request = await PayoutRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, "Payout request not found");
  if (request.status !== "pending") throw new ApiError(400, "This request has already been processed");

  request.status = "rejected";
  request.processedAt = new Date();
  request.processedBy = req.user.id;
  if (req.body?.note) request.adminNote = req.body.note;
  await request.save();

  res.json(request);
});

// GET /api/admin/pickups
exports.getAllPickups = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Pickup.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
      .populate("collector", "name email"),
    Pickup.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});