const User = require("../models/User");
const Pickup = require("../models/Pickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

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