const FREQUENCIES = ["weekly", "biweekly", "monthly"];

/**
 * Returns the next run date for a recurring pickup, given its frequency
 * and the date to count forward from. Kept as a pure function (no DB, no
 * "now" implicitly baked in) so both the controller (computing the first
 * run) and the cron job (computing each subsequent run) share the exact
 * same rule, and so it's trivially unit-testable without a database.
 *
 * The cron job always advances from the previous `nextRunAt`, not from
 * "now" — advancing from "now" would let a scheduled series drift later
 * and later if the job ever runs a bit late (e.g. server restart), since
 * each run's error would compound into the next. Anchoring to the stored
 * schedule keeps every occurrence on its original cadence regardless of
 * when the cron actually happened to fire.
 */
function computeNextRun(frequency, from = new Date()) {
  const next = new Date(from);

  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      return next;
    case "monthly": {
      // setMonth on a date like Jan 31 rolls over into March if the target
      // month is shorter (Feb has no 31st) — clamp to the last real day of
      // the target month instead of silently skipping a month.
      const day = next.getDate();
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      const lastDayOfTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, lastDayOfTargetMonth));
      return next;
    }
    default:
      throw new Error(`Unknown recurrence frequency: ${frequency}`);
  }
}

module.exports = { computeNextRun, FREQUENCIES };