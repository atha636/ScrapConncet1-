const PlatformSettings = require("../models/PlatformSettings");
const PlanPurchase = require("../models/PlanPurchase");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { logAudit } = require("../utils/audit");
const { getAvailableBalance } = require("../utils/walletBalance");
const { PLAN_DAYS, getSettings, effectivePlanKey } = require("../utils/plans");

const DAY_MS = 86400000;

// New expiry: stacks on the current period when renewing the same plan,
// otherwise starts now (switching plans does not carry over leftover days).
function nextPeriod(user, planKey, days) {
  const now = new Date();
  const current = effectivePlanKey(user, now);
  const startsAt = current === planKey ? new Date(user.subscription.expiresAt) : now;
  return { startsAt, expiresAt: new Date(startsAt.getTime() + days * DAY_MS) };
}

// GET /api/plans  (collector)
exports.getPlans = asyncHandler(async (req, res) => {
  const [settings, user, balance] = await Promise.all([
    getSettings(),
    User.findById(req.user.id).select("subscription"),
    getAvailableBalance(req.user.id),
  ]);
  const planKey = effectivePlanKey(user);
  res.json({
    commissionEnabled: settings.commissionEnabled,
    plans: settings.plans,
    days: PLAN_DAYS,
    current: { planKey, expiresAt: planKey === "free" ? null : user.subscription.expiresAt },
    available: balance.available,
  });
});

// POST /api/plans/subscribe  (collector) — pay for a plan from the wallet
exports.subscribe = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const plan = settings.plans.find((p) => p.key === req.body.planKey);
  if (!plan || plan.priceMonthly <= 0) throw new ApiError(400, "That plan can't be purchased");

  const user = await User.findById(req.user.id).select("subscription");
  const { available } = await getAvailableBalance(req.user.id);
  if (available < plan.priceMonthly) {
    throw new ApiError(400, `Your wallet has ₹${available}. ${plan.name} costs ₹${plan.priceMonthly}.`);
  }

  const { startsAt, expiresAt } = nextPeriod(user, plan.key, PLAN_DAYS);
  await Transaction.create({ collector: req.user.id, type: "subscription", amount: plan.priceMonthly });
  await PlanPurchase.create({
    collector: req.user.id,
    planKey: plan.key,
    price: plan.priceMonthly,
    days: PLAN_DAYS,
    method: "wallet",
    startsAt,
    expiresAt,
  });
  await User.updateOne({ _id: req.user.id }, { $set: { subscription: { planKey: plan.key, expiresAt } } });

  res.json({ planKey: plan.key, expiresAt });
});

/* ------------------------------- admin side ------------------------------ */

const monthKey = (d) => d.toISOString().slice(0, 7);

// GET /api/plans/admin  (admin) — settings, revenue and subscriber counts
exports.adminOverview = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [commissionAll, commissionByMonth, subsAll, subsByMonth, subscribers] = await Promise.all([
    Transaction.aggregate([
      { $match: { type: "earning", commission: { $gt: 0 } } },
      { $group: { _id: null, sum: { $sum: "$commission" }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { type: "earning", commission: { $gt: 0 }, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, sum: { $sum: "$commission" } } },
    ]),
    PlanPurchase.aggregate([{ $group: { _id: null, sum: { $sum: "$price" }, count: { $sum: 1 } } }]),
    PlanPurchase.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, sum: { $sum: "$price" } } },
    ]),
    User.aggregate([
      { $match: { role: "collector", "subscription.expiresAt": { $gt: now } } },
      { $group: { _id: "$subscription.planKey", n: { $sum: 1 } } },
    ]),
  ]);

  const cm = Object.fromEntries(commissionByMonth.map((r) => [r._id, r.sum]));
  const sm = Object.fromEntries(subsByMonth.map((r) => [r._id, r.sum]));
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const key = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)));
    months.push({ month: key, commission: cm[key] || 0, subscriptions: sm[key] || 0 });
  }

  const paid = Object.fromEntries(subscribers.map((s) => [s._id, s.n]));
  res.json({
    settings,
    revenue: {
      commissionTotal: commissionAll[0]?.sum || 0,
      commissionPickups: commissionAll[0]?.count || 0,
      subscriptionTotal: subsAll[0]?.sum || 0,
      subscriptionSales: subsAll[0]?.count || 0,
      months,
    },
    subscribers: { pro: paid.pro || 0, elite: paid.elite || 0 },
  });
});

// PUT /api/plans/admin/settings  (admin)
exports.adminSaveSettings = asyncHandler(async (req, res) => {
  const before = await getSettings();
  await PlatformSettings.findOneAndUpdate(
    { key: "main" },
    { $set: { commissionEnabled: req.body.commissionEnabled, plans: req.body.plans } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await logAudit(req, {
    action: "plans.update",
    targetType: "settings",
    targetLabel: "Commission & plans",
    details: { commissionEnabled: req.body.commissionEnabled, was: before.commissionEnabled },
  });
  res.json(await getSettings());
});

// POST /api/plans/admin/grant  (admin) — activate a plan for a collector who
// paid outside the app; recorded as revenue.
exports.adminGrant = asyncHandler(async (req, res) => {
  const { email, planKey, amountPaid, reference } = req.body;
  const days = req.body.days || PLAN_DAYS;

  const collector = await User.findOne({ email, role: "collector" }).select("name subscription");
  if (!collector) throw new ApiError(404, "No collector found with that email");

  const { startsAt, expiresAt } = nextPeriod(collector, planKey, days);
  await PlanPurchase.create({
    collector: collector._id,
    planKey,
    price: amountPaid,
    days,
    method: "admin",
    reference,
    grantedBy: req.user.id,
    startsAt,
    expiresAt,
  });
  await User.updateOne({ _id: collector._id }, { $set: { subscription: { planKey, expiresAt } } });

  await logAudit(req, {
    action: "plans.grant",
    targetType: "user",
    targetId: collector._id,
    targetLabel: collector.name,
    details: { planKey, days, amountPaid },
  });
  await notifyUser(req.io, collector._id, {
    type: "status_update",
    text: `Your ${planKey === "elite" ? "Elite" : "Pro"} plan is active until ${expiresAt.toLocaleDateString("en-IN")}.`,
  });
  res.json({ ok: true, expiresAt });
});