const {
  computeBadges,
  MIN_RATINGS_FOR_TOP_RATED,
  TOP_RATED_THRESHOLD,
  FAST_RESPONDER_MAX_MINUTES,
  RELIABLE_MIN_RATE,
} = require("../src/utils/badges");

const baseStats = {
  completedCount: 0,
  rating: 0,
  ratingCount: 0,
  avgAcceptMinutes: null,
  completionRate: null,
};

describe("computeBadges", () => {
  test("a brand-new collector with no history earns no badges", () => {
    expect(computeBadges(baseStats)).toEqual([]);
  });

  test("awards the first-pickup badge at exactly 1 completion", () => {
    const badges = computeBadges({ ...baseStats, completedCount: 1 });
    expect(badges.map((b) => b.id)).toContain("pickups_1");
  });

  test("shows only the highest milestone tier reached, not every tier along the way", () => {
    const badges = computeBadges({ ...baseStats, completedCount: 120 });
    const milestoneIds = badges.filter((b) => b.id.startsWith("pickups_")).map((b) => b.id);
    expect(milestoneIds).toEqual(["pickups_100"]);
  });

  test("just short of a milestone shows the tier below it", () => {
    const badges = computeBadges({ ...baseStats, completedCount: 49 });
    const milestoneIds = badges.filter((b) => b.id.startsWith("pickups_")).map((b) => b.id);
    expect(milestoneIds).toEqual(["pickups_10"]);
  });

  test("top rated requires both the rating floor and the sample-size floor", () => {
    const highRatingLowSample = computeBadges({
      ...baseStats,
      rating: 5,
      ratingCount: MIN_RATINGS_FOR_TOP_RATED - 1,
    });
    expect(highRatingLowSample.map((b) => b.id)).not.toContain("top_rated");

    const highSampleLowRating = computeBadges({
      ...baseStats,
      rating: TOP_RATED_THRESHOLD - 0.1,
      ratingCount: MIN_RATINGS_FOR_TOP_RATED,
    });
    expect(highSampleLowRating.map((b) => b.id)).not.toContain("top_rated");

    const both = computeBadges({
      ...baseStats,
      rating: TOP_RATED_THRESHOLD,
      ratingCount: MIN_RATINGS_FOR_TOP_RATED,
    });
    expect(both.map((b) => b.id)).toContain("top_rated");
  });

  test("fast responder at exactly the threshold qualifies", () => {
    const badges = computeBadges({ ...baseStats, avgAcceptMinutes: FAST_RESPONDER_MAX_MINUTES });
    expect(badges.map((b) => b.id)).toContain("fast_responder");
  });

  test("one minute over the fast-responder threshold does not qualify", () => {
    const badges = computeBadges({ ...baseStats, avgAcceptMinutes: FAST_RESPONDER_MAX_MINUTES + 1 });
    expect(badges.map((b) => b.id)).not.toContain("fast_responder");
  });

  test("a null avgAcceptMinutes (below reliabilityStats' own sample floor) never earns fast responder", () => {
    const badges = computeBadges({ ...baseStats, avgAcceptMinutes: null });
    expect(badges.map((b) => b.id)).not.toContain("fast_responder");
  });

  test("reliable badge respects the completion-rate floor", () => {
    const badges = computeBadges({ ...baseStats, completionRate: RELIABLE_MIN_RATE });
    expect(badges.map((b) => b.id)).toContain("reliable");

    const justBelow = computeBadges({ ...baseStats, completionRate: RELIABLE_MIN_RATE - 0.01 });
    expect(justBelow.map((b) => b.id)).not.toContain("reliable");
  });

  test("a null completionRate never earns reliable", () => {
    const badges = computeBadges({ ...baseStats, completionRate: null });
    expect(badges.map((b) => b.id)).not.toContain("reliable");
  });

  test("a seasoned, well-reviewed, fast, reliable collector earns every badge at once", () => {
    const badges = computeBadges({
      completedCount: 300,
      rating: 4.9,
      ratingCount: 50,
      avgAcceptMinutes: 5,
      completionRate: 0.99,
    });
    expect(badges.map((b) => b.id).sort()).toEqual(
      ["pickups_250", "top_rated", "fast_responder", "reliable"].sort()
    );
  });
});