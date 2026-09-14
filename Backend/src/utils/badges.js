// Badges are purely derived from stats buildCollectorProfile already
// computes elsewhere (completedCount, rating, avgAcceptMinutes,
// completionRate) — there's no separate "badges" collection and nothing
// new gets written to the database. That means a badge can never drift out
// of sync with the numbers it's based on, and there's no migration needed
// if the thresholds below ever change — the next profile fetch just
// recomputes from scratch.

// Only the highest tier reached is shown for a milestone track (a
// collector with 120 completions sees "100 pickups", not four separate
// badges stacked for 1/10/50/100) — ordered lowest to highest so
// `findLast`-style iteration below can just take the last one that
// qualifies.
const PICKUP_MILESTONES = [
  { threshold: 1, id: "pickups_1", label: "First pickup", icon: "📦" },
  { threshold: 10, id: "pickups_10", label: "10 pickups", icon: "📦" },
  { threshold: 50, id: "pickups_50", label: "50 pickups", icon: "🏅" },
  { threshold: 100, id: "pickups_100", label: "100 pickups", icon: "🥇" },
  { threshold: 250, id: "pickups_250", label: "250 pickups", icon: "💎" },
];

// Same floors as reliabilityStats.js's own MIN_SAMPLE constants — a badge
// is a stronger public claim than the plain stat it's derived from, so it
// shouldn't appear a moment before the stat itself is considered reliable
// enough to show at all.
const MIN_RATINGS_FOR_TOP_RATED = 10;
const TOP_RATED_THRESHOLD = 4.5;
const FAST_RESPONDER_MAX_MINUTES = 15;
const RELIABLE_MIN_RATE = 0.95;

/**
 * @param {object} stats
 * @param {number} stats.completedCount
 * @param {number} stats.rating
 * @param {number} stats.ratingCount
 * @param {number|null} stats.avgAcceptMinutes - already null below the sample floor (see reliabilityStats.js), so no extra floor check needed here
 * @param {number|null} stats.completionRate - same
 * @returns {Array<{id: string, label: string, icon: string}>}
 */
function computeBadges({ completedCount, rating, ratingCount, avgAcceptMinutes, completionRate }) {
  const badges = [];

  const highestMilestone = [...PICKUP_MILESTONES].reverse().find((m) => completedCount >= m.threshold);
  if (highestMilestone) {
    const { threshold: _threshold, ...badge } = highestMilestone;
    badges.push(badge);
  }

  if (ratingCount >= MIN_RATINGS_FOR_TOP_RATED && rating >= TOP_RATED_THRESHOLD) {
    badges.push({ id: "top_rated", label: "Top rated", icon: "⭐" });
  }

  if (avgAcceptMinutes != null && avgAcceptMinutes <= FAST_RESPONDER_MAX_MINUTES) {
    badges.push({ id: "fast_responder", label: "Fast responder", icon: "⚡" });
  }

  if (completionRate != null && completionRate >= RELIABLE_MIN_RATE) {
    badges.push({ id: "reliable", label: "Reliable", icon: "✅" });
  }

  return badges;
}

/**
 * The full-catalog counterpart to computeBadges above — where that
 * function returns only what's currently earned (highest milestone tier
 * only, one entry per other badge), this returns every badge in the
 * catalog with an `earned` flag and, where the underlying stat is a plain
 * count, a `current`/`target` pair a progress bar can render directly.
 * Meant for a collector looking at their own achievements panel and
 * wanting to see what's next, not for anything shown to a stranger — see
 * getMyAchievements's own comment for why this stays auth'd to the
 * collector themselves rather than exposed by :id.
 *
 * Every milestone tier is included (not just the next locked one) so the
 * panel reads as a track record — earlier tiers stay visible and checked
 * off rather than disappearing once superseded.
 *
 * @param {object} stats - same shape as computeBadges accepts
 * @returns {Array<{id: string, label: string, icon: string, earned: boolean, current?: number, target?: number, hint?: string}>}
 */
function getBadgeProgress({ completedCount, rating, ratingCount, avgAcceptMinutes, completionRate }) {
  const progress = PICKUP_MILESTONES.map((m) => ({
    id: m.id,
    label: m.label,
    icon: m.icon,
    earned: completedCount >= m.threshold,
    current: Math.min(completedCount, m.threshold),
    target: m.threshold,
  }));

  // ratingCount is the only part of "top rated" that's a plain count a bar
  // can represent — the rating-value half of the requirement is stated in
  // the hint instead, since "4.2 of 4.5 stars" isn't the kind of progress
  // that only moves in one direction the way a count does.
  progress.push({
    id: "top_rated",
    label: "Top rated",
    icon: "⭐",
    earned: ratingCount >= MIN_RATINGS_FOR_TOP_RATED && rating >= TOP_RATED_THRESHOLD,
    current: Math.min(ratingCount, MIN_RATINGS_FOR_TOP_RATED),
    target: MIN_RATINGS_FOR_TOP_RATED,
    hint: `${TOP_RATED_THRESHOLD}+ average rating over ${MIN_RATINGS_FOR_TOP_RATED}+ ratings`,
  });

  // No current/target for these two — "average minutes" and "% completed"
  // aren't counts that climb toward a target the way completedCount or
  // ratingCount do (an accept-time average can move in either direction
  // pickup to pickup), so a hint-only description is the honest
  // representation rather than a progress bar implying a false sense of
  // steady, one-way progress.
  progress.push({
    id: "fast_responder",
    label: "Fast responder",
    icon: "⚡",
    earned: avgAcceptMinutes != null && avgAcceptMinutes <= FAST_RESPONDER_MAX_MINUTES,
    hint: `Average accept time under ${FAST_RESPONDER_MAX_MINUTES} min`,
  });

  progress.push({
    id: "reliable",
    label: "Reliable",
    icon: "✅",
    earned: completionRate != null && completionRate >= RELIABLE_MIN_RATE,
    hint: `${Math.round(RELIABLE_MIN_RATE * 100)}%+ completion rate`,
  });

  return progress;
}

module.exports = {
  computeBadges,
  getBadgeProgress,
  PICKUP_MILESTONES,
  MIN_RATINGS_FOR_TOP_RATED,
  TOP_RATED_THRESHOLD,
  FAST_RESPONDER_MAX_MINUTES,
  RELIABLE_MIN_RATE,
};