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

module.exports = {
  computeBadges,
  PICKUP_MILESTONES,
  MIN_RATINGS_FOR_TOP_RATED,
  TOP_RATED_THRESHOLD,
  FAST_RESPONDER_MAX_MINUTES,
  RELIABLE_MIN_RATE,
};