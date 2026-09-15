const {
  haversineKm,
  routeLengthKm,
  nearestNeighbour,
  optimizeRoute,
} = require("../src/utils/routeOptimizer");

// Chandigarh-ish coordinates, spread a few km apart.
const START = { lat: 30.7333, lng: 76.7794 };

describe("haversineKm", () => {
  test("is zero for the same point", () => {
    expect(haversineKm(START, START)).toBeCloseTo(0);
  });

  test("is symmetric", () => {
    const a = { lat: 30.70, lng: 76.75 };
    const b = { lat: 30.76, lng: 76.81 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a));
  });

  test("matches a known distance within a sensible tolerance", () => {
    // ~1 degree of latitude is ~111 km anywhere on the globe.
    const a = { lat: 30.0, lng: 76.0 };
    const b = { lat: 31.0, lng: 76.0 };
    expect(haversineKm(a, b)).toBeGreaterThan(110);
    expect(haversineKm(a, b)).toBeLessThan(112);
  });
});

describe("routeLengthKm", () => {
  test("is zero with no stops", () => {
    expect(routeLengthKm(START, [])).toBe(0);
  });

  test("a single stop is just the distance from the start", () => {
    const stop = { id: "a", lat: 30.76, lng: 76.81 };
    expect(routeLengthKm(START, [stop])).toBeCloseTo(haversineKm(START, stop));
  });
});

describe("nearestNeighbour", () => {
  test("visits every stop exactly once", () => {
    const stops = [
      { id: "a", lat: 30.75, lng: 76.78 },
      { id: "b", lat: 30.80, lng: 76.85 },
      { id: "c", lat: 30.70, lng: 76.75 },
    ];
    const ordered = nearestNeighbour(START, stops);
    expect(ordered).toHaveLength(3);
    expect(ordered.map((s) => s.id).sort()).toEqual(["a", "b", "c"]);
  });

  test("picks the genuinely closest stop first", () => {
    const near = { id: "near", lat: 30.7340, lng: 76.7800 };
    const far = { id: "far", lat: 31.50, lng: 77.50 };
    const ordered = nearestNeighbour(START, [far, near]);
    expect(ordered[0].id).toBe("near");
  });
});

describe("optimizeRoute", () => {
  test("handles an empty stop list", () => {
    const result = optimizeRoute(START, []);
    expect(result.ordered).toEqual([]);
    expect(result.totalKm).toBe(0);
    expect(result.savedKm).toBe(0);
  });

  test("keeps every stop and never loses or duplicates one", () => {
    const stops = [
      { id: "a", lat: 30.75, lng: 76.78 },
      { id: "b", lat: 30.80, lng: 76.85 },
      { id: "c", lat: 30.70, lng: 76.75 },
      { id: "d", lat: 30.72, lng: 76.90 },
      { id: "e", lat: 30.78, lng: 76.72 },
    ];
    const { ordered } = optimizeRoute(START, stops);
    expect(ordered).toHaveLength(5);
    expect(ordered.map((s) => s.id).sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("never returns a route longer than the input order", () => {
    const stops = [
      { id: "far", lat: 30.95, lng: 77.05 },
      { id: "near", lat: 30.7350, lng: 76.7810 },
      { id: "mid", lat: 30.82, lng: 76.88 },
      { id: "near2", lat: 30.7370, lng: 76.7830 },
    ];
    const { totalKm, naiveKm } = optimizeRoute(START, stops);
    expect(totalKm).toBeLessThanOrEqual(naiveKm + 1e-9);
  });

  test("meaningfully improves a deliberately zigzagging input order", () => {
    // Stops laid out in a straight line east, but handed over in an order
    // that bounces back and forth across it — exactly the case route
    // ordering should fix.
    const stops = [
      { id: "s4", lat: 30.7333, lng: 76.84 },
      { id: "s1", lat: 30.7333, lng: 76.79 },
      { id: "s3", lat: 30.7333, lng: 76.82 },
      { id: "s2", lat: 30.7333, lng: 76.80 },
    ];
    const { ordered, savedKm, naiveKm, totalKm } = optimizeRoute(START, stops);

    expect(savedKm).toBeGreaterThan(0);
    expect(totalKm).toBeLessThan(naiveKm);
    // With everything on one line heading east, the optimal visit order is
    // simply west-to-east.
    expect(ordered.map((s) => s.id)).toEqual(["s1", "s2", "s3", "s4"]);
  });

  test("savedKm is never negative", () => {
    const stops = [{ id: "a", lat: 30.75, lng: 76.78 }];
    expect(optimizeRoute(START, stops).savedKm).toBeGreaterThanOrEqual(0);
  });

  test("a two-stop route is already trivially optimal in one of two orders", () => {
    const stops = [
      { id: "a", lat: 30.74, lng: 76.78 },
      { id: "b", lat: 30.90, lng: 76.95 },
    ];
    const { ordered, totalKm, naiveKm } = optimizeRoute(START, stops);
    expect(ordered).toHaveLength(2);
    expect(totalKm).toBeLessThanOrEqual(naiveKm + 1e-9);
  });
});