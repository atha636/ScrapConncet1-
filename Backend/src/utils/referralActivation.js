const User = require("../models/User");
const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const Referral = require("../models/Referral");
const notifyUser = require("./notifyUser");
const { REFERRAL_BONUS_AMOUNT } = require("./referralRules");

/**
 * Call this after any pickup completes, once for each party on it (see
 * pickupController's updateStatus — both pickup.collector and pickup.user
 * get checked, since either one could be the referee here). Resolves a
 * pending Referral the moment its referee completes their first-ever
 * pickup — deliberately gated on "first ever," not "signed up via a
 * link," so a fresh throwaway account can't farm rewards without doing
 * anything real on the platform.
 *
 * Fire-and-forget from every call site, same convention as
 * badgeNotifier's syncCollectorBadges — a missed referral activation is a
 * cosmetic gap, never something that should threaten the pickup
 * completion it's riding on.
 */
async function activateReferralIfEligible(io, personId) {
  const referral = await Referral.findOne({ referee: personId, status: "pending" });
  if (!referral) return;

  const person = await User.findById(personId).select("role");
  if (!person) return;

  // Whichever role this person actually has determines which field on
  // Pickup identifies pickups as theirs — a referee could be either a
  // requester or a collector, and "first pickup" means something
  // different on each side (see requesterBadgeState.js / badges.js for
  // the same person/collector split elsewhere in the codebase).
  const completedCount =
    person.role === "collector"
      ? await Pickup.countDocuments({ collector: personId, status: "completed" })
      : await Pickup.countDocuments({ user: personId, status: "completed" });

  // Not "=== 1" — the atomic claim below is what actually guarantees
  // single-fire, not this count, so ">= 1" is enough and doesn't depend on
  // this running at exactly one precise moment.
  if (completedCount < 1) return;

  const referrer = await User.findById(referral.referrer).select("role");

  // A reward only exists to credit into if the referrer is a collector —
  // there's no wallet concept at all for a "user"-role referrer in this
  // app yet (see referralRules.js's own comment on why this is a flat
  // amount rather than a percentage). The referral itself still resolves
  // to "completed" either way; it just carries a 0 reward when there's
  // nowhere for that reward to go.
  const rewardAmount = referrer?.role === "collector" ? REFERRAL_BONUS_AMOUNT : 0;

  // Atomic compare-and-swap keyed on {_id, status: "pending"} rather than
  // calling .save() on the document fetched above — a plain fetch-then-
  // save re-checks Mongoose's version key at save time, which is the
  // exact pattern that caused badgeNotifier's VersionError bug (see that
  // file's own comment). This is also what makes double-completion races
  // safe: if two calls somehow both reach this point for the same
  // referral, only one of them will successfully match status: "pending"
  // and flip it — the other gets null back and does nothing further, so
  // a reward can never be double-credited.
  const claimed = await Referral.findOneAndUpdate(
    { _id: referral._id, status: "pending" },
    { status: "completed", rewardAmount, rewardedAt: new Date() }
  );
  if (!claimed) return;

  if (rewardAmount > 0) {
    await Transaction.create({
      collector: referral.referrer,
      type: "referral_bonus",
      amount: rewardAmount,
    });
  }

  await notifyUser(io, referral.referrer, {
    type: "referral_reward",
    text:
      rewardAmount > 0
        ? `🎉 Your referral just completed their first pickup — you earned ₹${rewardAmount}!`
        : `🎉 Someone you referred just completed their first pickup!`,
  });
}

module.exports = { activateReferralIfEligible };