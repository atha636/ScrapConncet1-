const Coupon = require("../models/Coupon");
const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const ApiError = require("./ApiError");
const notifyUser = require("./notifyUser");

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

// Bonus in whole rupees for a given price. 0 if the price is below the
// coupon's minimum.
function computeBonus(coupon, price) {
  if (!coupon || !(price > 0)) return 0;
  if (price < (coupon.minOrderValue || 0)) return 0;
  let bonus = coupon.type === "percent" ? Math.round((price * coupon.value) / 100) : Math.round(coupon.value);
  if (coupon.type === "percent" && coupon.maxBonus) bonus = Math.min(bonus, coupon.maxBonus);
  return Math.max(0, bonus);
}

// Everything that decides whether THIS person can use THIS code right now.
// Throws a friendly 400 otherwise. Uses (non-cancelled pickups carrying the
// code) are counted rather than kept in a counter, so a cancelled pickup
// frees its use automatically.
async function assertCouponUsable(rawCode, userId) {
  const code = normalizeCode(rawCode);
  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.active) throw new ApiError(400, "That promo code isn't valid");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, "That promo code has expired");

  const used = { "coupon.couponId": coupon._id, status: { $ne: "cancelled" } };
  if (coupon.maxRedemptions) {
    if ((await Pickup.countDocuments(used)) >= coupon.maxRedemptions) {
      throw new ApiError(400, "That promo code has been fully used");
    }
  }
  if ((await Pickup.countDocuments({ ...used, user: userId })) >= coupon.perUserLimit) {
    throw new ApiError(400, "You've already used that promo code");
  }
  if (coupon.firstPickupOnly) {
    if ((await Pickup.countDocuments({ user: userId, status: { $ne: "cancelled" } })) > 0) {
      throw new ApiError(400, "That promo code is for your first pickup only");
    }
  }
  return coupon;
}

// Snapshot stored on the pickup, so later edits/disabling of the coupon
// can't change what an existing pickup was promised.
const snapshotOf = (coupon) => ({
  couponId: coupon._id,
  code: coupon.code,
  type: coupon.type,
  value: coupon.value,
  maxBonus: coupon.maxBonus || null,
  minOrderValue: coupon.minOrderValue || 0,
});

// Called from settlement.creditEarning once the final price is real money.
// The platform pays the bonus: it goes into the collector's wallet (the
// collector hands the requester price + bonus). Idempotent via the unique
// {pickup, type} index, so retries can't double-credit.
async function creditCouponBonus(io, pickup) {
  const snap = pickup.coupon;
  if (!snap?.code || snap.bonusAmount) return;
  const bonus = computeBonus(snap, pickup.price);
  if (bonus <= 0) return;

  try {
    await Transaction.create({ collector: pickup.collector, pickup: pickup._id, type: "coupon_credit", amount: bonus });
  } catch (err) {
    if (err.code === 11000) return;
    throw err;
  }
  await Pickup.updateOne({ _id: pickup._id }, { $set: { "coupon.bonusAmount": bonus } });

  await notifyUser(io, pickup.user, {
    type: "status_update",
    text: `Promo ${snap.code} applied — your collector will add a ₹${bonus} bonus on top of your payout.`,
    pickupId: pickup._id,
  });
  if (pickup.collector) {
    await notifyUser(io, pickup.collector, {
      type: "status_update",
      text: `Promo ${snap.code}: pay the requester ₹${bonus} extra — ₹${bonus} has been added to your wallet to cover it.`,
      pickupId: pickup._id,
    });
  }
}

module.exports = { normalizeCode, computeBonus, assertCouponUsable, snapshotOf, creditCouponBonus };