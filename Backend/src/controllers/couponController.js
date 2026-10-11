const Coupon = require("../models/Coupon");
const Pickup = require("../models/Pickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { logAudit } = require("../utils/audit");
const { assertCouponUsable, computeBonus } = require("../utils/coupons");

const describe = (c) =>
  c.type === "percent"
    ? `${c.value}% bonus${c.maxBonus ? ` (up to ₹${c.maxBonus})` : ""}`
    : `₹${c.value} bonus`;

// POST /api/coupons/validate  (user)  — pre-check while filling the form
exports.validateCode = asyncHandler(async (req, res) => {
  const coupon = await assertCouponUsable(req.body.code, req.user.id);
  const estimatedBonus =
    req.body.estimatedPrice != null ? computeBonus(coupon, req.body.estimatedPrice) : null;
  res.json({
    code: coupon.code,
    summary: describe(coupon),
    description: coupon.description,
    minOrderValue: coupon.minOrderValue,
    estimatedBonus,
  });
});

// GET /api/coupons/admin  (admin)
exports.adminList = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  const usage = await Pickup.aggregate([
    { $match: { "coupon.couponId": { $in: coupons.map((c) => c._id) }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$coupon.couponId", used: { $sum: 1 }, bonusPaid: { $sum: { $ifNull: ["$coupon.bonusAmount", 0] } } } },
  ]);
  const byId = Object.fromEntries(usage.map((u) => [String(u._id), u]));
  res.json({
    coupons: coupons.map((c) => ({
      ...c.toObject(),
      summary: describe(c),
      used: byId[String(c._id)]?.used || 0,
      bonusPaid: byId[String(c._id)]?.bonusPaid || 0,
    })),
  });
});

// POST /api/coupons/admin  (admin)
exports.adminCreate = asyncHandler(async (req, res) => {
  if (await Coupon.exists({ code: req.body.code })) throw new ApiError(409, "That code already exists");
  const coupon = await Coupon.create(req.body);
  await logAudit(req, {
    action: "coupon.create",
    targetType: "coupon",
    targetId: coupon._id,
    targetLabel: coupon.code,
    details: { summary: describe(coupon) },
  });
  res.status(201).json(coupon);
});

// PATCH /api/coupons/admin/:id  (admin)
exports.adminUpdate = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  await logAudit(req, {
    action: "coupon.update",
    targetType: "coupon",
    targetId: coupon._id,
    targetLabel: coupon.code,
    details: req.body,
  });
  res.json(coupon);
});