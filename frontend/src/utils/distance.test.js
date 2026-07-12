import { describe, test, expect } from "vitest";
import { distanceKm, formatDistance } from "./distance";

describe("distanceKm", () => {
  test("returns 0 for identical coordinates", () => {
    expect(distanceKm(26.32, 76.22, 26.32, 76.22)).toBeCloseTo(0, 5);
  });

  test("computes a known real-world distance correctly (Chandigarh to Delhi, ~240km)", () => {
    // Chandigarh: 30.7333, 76.7794 — New Delhi: 28.6139, 77.2090
    const km = distanceKm(30.7333, 76.7794, 28.6139, 77.2090);
    expect(km).toBeGreaterThan(230);
    expect(km).toBeLessThan(250);
  });

  test("is symmetric — distance A to B equals B to A", () => {
    const ab = distanceKm(26.32, 76.22, 26.35, 76.25);
    const ba = distanceKm(26.35, 76.25, 26.32, 76.22);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe("formatDistance", () => {
  test("formats sub-kilometer distances in meters", () => {
    expect(formatDistance(0.85)).toBe("850 m");
  });

  test("formats distances >= 1km with one decimal place", () => {
    expect(formatDistance(3.2)).toBe("3.2 km");
  });

  test("formats exactly 1km correctly", () => {
    expect(formatDistance(1)).toBe("1.0 km");
  });
});