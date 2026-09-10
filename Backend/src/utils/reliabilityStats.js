// A collector's accept-time and completion-rate stats are only meaningful
// once there's enough history behind them — a brand-new collector whose
// first-ever job happened to get cancelled shouldn't read as "0% completion
// rate" forever. These floors gate whether each stat is surfaced at all
// (see buildReliabilityStats below) rather than being shown with a caveat,
// since a caveat still leaves a scary-looking number as the headline.
const MIN_SAMPLE_FOR_ACCEPT_TIME = 3;
const MIN_SAMPLE_FOR_COMPLETION_RATE = 3;

/**
 * Turns a raw aggregation result (see the $group stage in
 * collectorStatsController) into the two numbers a profile actually shows.
 * Kept as a pure function — no DB access — so it's unit-testable the same
 * way computeStreak is, with the aggregation itself just supplying real
 * numbers from the database.
 *
 * @param {object} raw
 * @param {number} raw.totalAcceptMinutes - sum of (acceptedAt - createdAt) in minutes, across every pickup this collector has ever accepted
 * @param {number} raw.acceptedCount - how many pickups that sum is drawn from
 * @param {number} raw.completedCount - of those, how many reached "completed"
 * @param {number} raw.collectorCancelledCount - of those, how many this collector personally cancelled after accepting (not a requester-initiated cancellation — see the controller's aggregation for how that's told apart)
 */
function buildReliabilityStats({
  totalAcceptMinutes,
  acceptedCount,
  completedCount,
  collectorCancelledCount,
}) {
  const avgAcceptMinutes =
    acceptedCount >= MIN_SAMPLE_FOR_ACCEPT_TIME ? totalAcceptMinutes / acceptedCount : null;

  // The denominator here is deliberately "completed + collector-cancelled",
  // not "every pickup ever accepted" — a still-open accepted/in_progress
  // job has no outcome yet, and a requester cancelling isn't something the
  // collector did, so neither belongs in a stat about the collector's own
  // follow-through.
  const decidedCount = completedCount + collectorCancelledCount;
  const completionRate =
    decidedCount >= MIN_SAMPLE_FOR_COMPLETION_RATE ? completedCount / decidedCount : null;

  return { avgAcceptMinutes, completionRate };
}

module.exports = {
  buildReliabilityStats,
  MIN_SAMPLE_FOR_ACCEPT_TIME,
  MIN_SAMPLE_FOR_COMPLETION_RATE,
};