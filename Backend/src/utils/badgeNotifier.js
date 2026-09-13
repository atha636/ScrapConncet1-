const User = require("../models/User");
const notifyUser = require("./notifyUser");
const { getCollectorBadgeState } = require("../services/collectorBadgeState");

/**
 * Call this after anything that could change a collector's badges —
 * accepting a pickup (affects avgAcceptMinutes), a pickup completing
 * (completedCount, completionRate), or a rating landing on them (rating,
 * ratingCount). Badges themselves are never stored (see badges.js — always
 * computed fresh), but `earnedBadgeIds` on the User document is a small
 * exception: it's the only way to tell "just crossed this threshold" apart
 * from "has had this badge for months" without notifying on every single
 * profile fetch.
 *
 * Deliberately fire-and-forget from every call site (`.catch` a logged
 * error, never awaited into the critical path) — a missed badge
 * notification is a minor cosmetic gap, not something that should ever
 * turn into a failed pickup acceptance or a failed rating submission.
 */
async function syncCollectorBadges(io, collectorId) {
  const collector = await User.findById(collectorId).select("role rating ratingCount earnedBadgeIds");
  if (!collector || collector.role !== "collector") return;

  const { badges } = await getCollectorBadgeState(collectorId, collector);
  const currentIds = badges.map((b) => b.id);
  const previousIds = new Set(collector.earnedBadgeIds || []);
  const newlyEarned = badges.filter((b) => !previousIds.has(b.id));

  // Keep the stored snapshot in sync even when nothing new was earned this
  // time (e.g. the set legitimately hasn't changed) — cheap to skip the
  // write when it'd be a no-op, comparing lengths first before a full
  // array-equality check since a size mismatch alone already proves a
  // change happened.
  const idsChanged =
    currentIds.length !== previousIds.size || currentIds.some((id) => !previousIds.has(id));
  if (!idsChanged) return;

  // findByIdAndUpdate rather than collector.earnedBadgeIds = ...; collector.save()
  // — the document above was fetched purely to read a couple of fields, not
  // to hold onto across the getCollectorBadgeState() await in between. Using
  // .save() on it re-checks Mongoose's version key (__v) against whatever's
  // currently in the database, which throws if the document changed (or was
  // deleted) anywhere else during that gap — a real possibility here, since
  // this whole function is deliberately fire-and-forget and can end up
  // racing other writes to the same user. An atomic update sidesteps that
  // entirely: it doesn't care what changed in between, and doing nothing if
  // the user is gone by now is exactly the right behavior for a best-effort
  // notification.
  await User.findByIdAndUpdate(collectorId, { earnedBadgeIds: currentIds });

  for (const badge of newlyEarned) {
    await notifyUser(io, collectorId, {
      type: "badge_earned",
      text: `${badge.icon} New badge unlocked: ${badge.label}!`,
    });
  }
}

module.exports = syncCollectorBadges;