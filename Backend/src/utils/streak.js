/** Truncates a Date to its UTC calendar day, as a "YYYY-MM-DD" key. */
function toDayKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Computes a "consecutive days with at least one completed pickup" streak,
 * counting backward from `today`. Kept as a pure function — no DB access,
 * no implicit "now" — so it's trivially unit-testable and the controller
 * just supplies real completion dates from the database.
 *
 * If there's no completion yet today, the streak still counts backward
 * from yesterday rather than resetting to 0 the instant midnight passes —
 * a collector who worked yesterday and simply hasn't completed anything
 * *yet* today shouldn't see their streak vanish before they've had a
 * chance to. It only actually breaks once a full calendar day (their most
 * recent completion's day, plus one) passes with nothing logged.
 *
 * Uses UTC calendar days throughout, not each collector's local timezone —
 * this backend doesn't store a per-user timezone, and a day boundary that's
 * "close enough" is an acceptable trade-off for a streak counter (unlike,
 * say, a billing cutoff), rather than adding timezone storage/plumbing for
 * marginal precision here.
 */
function computeStreak(completionDates, today = new Date()) {
  const days = new Set(completionDates.map(toDayKey));

  const cursor = new Date(today);
  if (!days.has(toDayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

module.exports = { computeStreak, toDayKey };