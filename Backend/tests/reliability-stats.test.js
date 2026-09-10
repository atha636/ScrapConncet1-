const {
  buildReliabilityStats,
  MIN_SAMPLE_FOR_ACCEPT_TIME,
  MIN_SAMPLE_FOR_COMPLETION_RATE,
} = require("../src/utils/reliabilityStats");

describe("buildReliabilityStats", () => {
  test("returns null for both stats with no accepted pickups at all", () => {
    const result = buildReliabilityStats({
      totalAcceptMinutes: 0,
      acceptedCount: 0,
      completedCount: 0,
      collectorCancelledCount: 0,
    });
    expect(result.avgAcceptMinutes).toBeNull();
    expect(result.completionRate).toBeNull();
  });

  test("withholds avgAcceptMinutes below the minimum sample size", () => {
    const result = buildReliabilityStats({
      totalAcceptMinutes: 10,
      acceptedCount: MIN_SAMPLE_FOR_ACCEPT_TIME - 1,
      completedCount: 1,
      collectorCancelledCount: 0,
    });
    expect(result.avgAcceptMinutes).toBeNull();
  });

  test("computes avgAcceptMinutes once the sample size is met", () => {
    const result = buildReliabilityStats({
      totalAcceptMinutes: 30,
      acceptedCount: MIN_SAMPLE_FOR_ACCEPT_TIME,
      completedCount: MIN_SAMPLE_FOR_ACCEPT_TIME,
      collectorCancelledCount: 0,
    });
    expect(result.avgAcceptMinutes).toBe(10);
  });

  test("withholds completionRate below the minimum decided sample size", () => {
    const result = buildReliabilityStats({
      totalAcceptMinutes: 10,
      acceptedCount: 10,
      completedCount: 1,
      collectorCancelledCount: MIN_SAMPLE_FOR_COMPLETION_RATE - 2,
    });
    expect(result.completionRate).toBeNull();
  });

  test("a single early cancellation doesn't read as a 0% completion rate", () => {
    // Exactly the scenario the sample-size floor exists for: one job,
    // cancelled, and nothing else yet.
    const result = buildReliabilityStats({
      totalAcceptMinutes: 5,
      acceptedCount: 1,
      completedCount: 0,
      collectorCancelledCount: 1,
    });
    expect(result.completionRate).toBeNull();
  });

  test("computes completionRate from completed vs collector-cancelled once decided", () => {
    const result = buildReliabilityStats({
      totalAcceptMinutes: 60,
      acceptedCount: 10,
      completedCount: 9,
      collectorCancelledCount: 1,
    });
    expect(result.completionRate).toBeCloseTo(0.9);
  });

  test("requester-initiated cancellations never enter this calculation", () => {
    // collectorCancelledCount only ever reflects cancellations the
    // collector themself made — a requester cancelling a pending/accepted
    // job is a separate code path (cancelByRequester) that the controller's
    // aggregation deliberately excludes before calling this function, so a
    // heavy requester-cancellation history shouldn't dent the rate at all.
    const result = buildReliabilityStats({
      totalAcceptMinutes: 60,
      acceptedCount: 20,
      completedCount: 5,
      collectorCancelledCount: 0,
    });
    // decidedCount = 5 + 0 = 5, meets the floor, rate is a clean 100%
    // despite 15 other accepted jobs sitting outside completed/cancelled
    // (e.g. still open, or cancelled by the requester).
    expect(result.completionRate).toBe(1);
  });

  test("a perfect record with a small sample still needs the floor met", () => {
    const result = buildReliabilityStats({
      totalAcceptMinutes: 20,
      acceptedCount: 2,
      completedCount: 2,
      collectorCancelledCount: 0,
    });
    expect(result.completionRate).toBeNull();
  });
});