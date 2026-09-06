const { computeStreak, toDayKey } = require("../src/utils/streak");

const d = (s) => new Date(s + "T12:00:00.000Z"); // midday UTC, avoids any near-midnight edge cases in the fixtures themselves

describe("computeStreak", () => {
  test("returns 0 with no completions at all", () => {
    expect(computeStreak([], d("2026-06-15"))).toBe(0);
  });

  test("counts 1 for a single completion today", () => {
    expect(computeStreak([d("2026-06-15")], d("2026-06-15"))).toBe(1);
  });

  test("counts consecutive days including today", () => {
    const dates = [d("2026-06-15"), d("2026-06-14"), d("2026-06-13")];
    expect(computeStreak(dates, d("2026-06-15"))).toBe(3);
  });

  test("keeps yesterday's streak alive if today has no completion yet", () => {
    // Worked 3 days straight ending yesterday, hasn't done anything yet
    // today — should still read as a 3-day streak, not reset to 0.
    const dates = [d("2026-06-14"), d("2026-06-13"), d("2026-06-12")];
    expect(computeStreak(dates, d("2026-06-15"))).toBe(3);
  });

  test("breaks once a full day is actually missed", () => {
    // Worked today and the day before, but skipped the day before that —
    // streak should stop at 2, not continue past the gap.
    const dates = [d("2026-06-15"), d("2026-06-14"), d("2026-06-12")];
    expect(computeStreak(dates, d("2026-06-15"))).toBe(2);
  });

  test("resets to 0 if more than a day has passed with nothing logged", () => {
    // Last completion was 3 days ago — too stale to count as an active streak.
    const dates = [d("2026-06-12")];
    expect(computeStreak(dates, d("2026-06-15"))).toBe(0);
  });

  test("counts multiple completions on the same day only once", () => {
    const dates = [d("2026-06-15"), d("2026-06-15"), d("2026-06-15")];
    expect(computeStreak(dates, d("2026-06-15"))).toBe(1);
  });

  test("correctly counts across a month boundary", () => {
    const dates = [d("2026-07-01"), d("2026-06-30"), d("2026-06-29")];
    expect(computeStreak(dates, d("2026-07-01"))).toBe(3);
  });

  test("defaults to counting from the real current date when none is given", () => {
    const result = computeStreak([new Date()]);
    expect(result).toBe(1);
  });
});

describe("toDayKey", () => {
  test("truncates to a YYYY-MM-DD key regardless of time of day", () => {
    expect(toDayKey(new Date("2026-06-15T23:59:59.999Z"))).toBe("2026-06-15");
    expect(toDayKey(new Date("2026-06-15T00:00:00.000Z"))).toBe("2026-06-15");
  });
});