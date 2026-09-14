const {
  computeBadges,
  getBadgeProgress,
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

describe("getBadgeProgress", () => {
  test("returns every milestone tier, not just the next locked one", () => {
    const progress = getBadgeProgress({ ...baseStats, completedCount: 5 });
    const milestoneIds = progress.filter((b) => b.id.startsWith("pickups_")).map((b) => b.id);
    expect(milestoneIds).toEqual(["pickups_1", "pickups_10", "pickups_50", "pickups_100", "pickups_250"]);
  });

  test("marks earlier tiers as earned once a later one is reached", () => {
    const progress = getBadgeProgress({ ...baseStats, completedCount: 60 });
    const byId = Object.fromEntries(progress.map((b) => [b.id, b]));
    expect(byId.pickups_1.earned).toBe(true);
    expect(byId.pickups_10.earned).toBe(true);
    expect(byId.pickups_50.earned).toBe(true);
    expect(byId.pickups_100.earned).toBe(false);
    expect(byId.pickups_250.earned).toBe(false);
  });

  test("caps current at target rather than overshooting the bar", () => {
    const progress = getBadgeProgress({ ...baseStats, completedCount: 999 });
    const byId = Object.fromEntries(progress.map((b) => [b.id, b]));
    expect(byId.pickups_10.current).toBe(10);
    expect(byId.pickups_10.target).toBe(10);
  });

  test("top_rated progress tracks ratingCount capped at the sample floor", () => {
    const progress = getBadgeProgress({ ...baseStats, ratingCount: 4 });
    const topRated = progress.find((b) => b.id === "top_rated");
    expect(topRated.current).toBe(4);
    expect(topRated.target).toBe(MIN_RATINGS_FOR_TOP_RATED);
    expect(topRated.earned).toBe(false);
  });

  test("top_rated is earned only once both rating and sample size clear their floors", () => {
    const progress = getBadgeProgress({
      ...baseStats,
      rating: TOP_RATED_THRESHOLD,
      ratingCount: MIN_RATINGS_FOR_TOP_RATED,
    });
    expect(progress.find((b) => b.id === "top_rated").earned).toBe(true);
  });

  test("fast_responder and reliable have no current/target — hint-only", () => {
    const progress = getBadgeProgress(baseStats);
    const fastResponder = progress.find((b) => b.id === "fast_responder");
    const reliable = progress.find((b) => b.id === "reliable");
    expect(fastResponder.current).toBeUndefined();
    expect(fastResponder.hint).toContain(String(FAST_RESPONDER_MAX_MINUTES));
    expect(reliable.current).toBeUndefined();
    expect(reliable.hint).toContain(String(Math.round(RELIABLE_MIN_RATE * 100)));
  });

  test("fast_responder and reliable flip to earned once their thresholds clear", () => {
    const progress = getBadgeProgress({
      ...baseStats,
      avgAcceptMinutes: FAST_RESPONDER_MAX_MINUTES,
      completionRate: RELIABLE_MIN_RATE,
    });
    expect(progress.find((b) => b.id === "fast_responder").earned).toBe(true);
    expect(progress.find((b) => b.id === "reliable").earned).toBe(true);
  });

  test("returns exactly 8 entries — 5 milestones plus 3 standalone badges", () => {
    const progress = getBadgeProgress(baseStats);
    expect(progress).toHaveLength(8);
  });
});