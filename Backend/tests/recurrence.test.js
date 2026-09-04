const { computeNextRun, FREQUENCIES } = require("../src/utils/recurrence");

describe("computeNextRun", () => {
  test("weekly advances by exactly 7 days", () => {
    const from = new Date("2026-03-10T08:00:00.000Z");
    expect(computeNextRun("weekly", from).toISOString()).toBe("2026-03-17T08:00:00.000Z");
  });

  test("biweekly advances by exactly 14 days", () => {
    const from = new Date("2026-03-10T08:00:00.000Z");
    expect(computeNextRun("biweekly", from).toISOString()).toBe("2026-03-24T08:00:00.000Z");
  });

  test("monthly advances to the same day next month in the ordinary case", () => {
    const from = new Date("2026-03-10T08:00:00.000Z");
    expect(computeNextRun("monthly", from).toISOString()).toBe("2026-04-10T08:00:00.000Z");
  });

  test("monthly clamps into a shorter month instead of rolling over", () => {
    // Jan 31 -> Feb has no 31st, so this must land on Feb 28 (non-leap
    // year), not silently roll into March 3rd the way naive setMonth() math
    // would.
    const from = new Date("2026-01-31T10:00:00.000Z");
    expect(computeNextRun("monthly", from).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });

  test("monthly clamps to Feb 29 in a leap year", () => {
    const from = new Date("2028-01-31T00:00:00.000Z");
    expect(computeNextRun("monthly", from).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  test("monthly correctly rolls December into January of the next year", () => {
    const from = new Date("2026-12-15T00:00:00.000Z");
    expect(computeNextRun("monthly", from).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  test("defaults to counting forward from now when no date is given", () => {
    const before = Date.now();
    const next = computeNextRun("weekly");
    const after = Date.now();
    // Should be ~7 days after "now", loosely bounded to avoid flaking on
    // exact millisecond timing.
    expect(next.getTime()).toBeGreaterThan(before + 6 * 24 * 60 * 60 * 1000);
    expect(next.getTime()).toBeLessThan(after + 8 * 24 * 60 * 60 * 1000);
  });

  test("throws on an unknown frequency rather than silently returning something wrong", () => {
    expect(() => computeNextRun("daily")).toThrow(/Unknown recurrence frequency/);
  });

  test("exports the canonical list of supported frequencies", () => {
    expect(FREQUENCIES).toEqual(["weekly", "biweekly", "monthly"]);
  });
});