const User = require("../models/User");
const Referral = require("../models/Referral");
const asyncHandler = require("../utils/asyncHandler");
const { ensureReferralCode } = require("../utils/referralCode");

// GET /api/referrals/me  (any authenticated role — anyone can refer anyone,
// see referralActivation.js for how the reward differs by the referrer's
// own role rather than by gating who's allowed to have a code at all).
//
// Generates this user's code on first visit if they don't have one yet
// (see ensureReferralCode's own comment on why that's lazy rather than
// backfilled for every account up front).
exports.getMyReferrals = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const code = await ensureReferralCode(user);

  const referrals = await Referral.find({ referrer: req.user.id })
    .sort({ createdAt: -1 })
    .populate("referee", "name role");

  const totalRewardEarned = referrals.reduce((sum, r) => sum + r.rewardAmount, 0);

  res.json({
    code,
    totalRewardEarned,
    referrals: referrals.map((r) => ({
      id: r._id,
      // A referee account could theoretically be gone by the time this is
      // viewed (see User's soft-delete via deletedAt elsewhere in the
      // codebase) — fall back to a generic label rather than crashing the
      // list or silently dropping the row.
      refereeName: r.referee?.name || "A referred user",
      status: r.status,
      rewardAmount: r.rewardAmount,
      createdAt: r.createdAt,
    })),
  });
});

// GET /api/referrals/validate/:code  (no auth — this backs a "you were
// invited by X" preview on the registration page itself, before the
// visitor has an account to authenticate with).
//
// Deliberately returns only a first name, never the referrer's email or
// id — enough to make the invite feel personal without turning a public,
// unauthenticated, guessable-8-character-code lookup into a way to
// enumerate real email addresses on the platform.
exports.validateReferralCode = asyncHandler(async (req, res) => {
  const referrer = await User.findOne({ referralCode: req.params.code.toUpperCase() }).select("name");
  if (!referrer) return res.json({ valid: false });

  res.json({ valid: true, referrerName: referrer.name.split(" ")[0] });
});