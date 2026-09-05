import { describe, test, expect } from "vitest";
import { latLngToTile, tileUrl } from "./staticMapTile";

// Standard inverse Slippy Map formula, used only here to independently
// verify latLngToTile's output rather than trusting a possibly-misremembered
// "expected" magic number.
function tileToLatLng(x, y, z) {
  const n = 2 ** z;
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
}

describe("latLngToTile", () => {
  test.each([
    ["Delhi", 28.6139, 77.209, 15],
    ["Berlin", 52.5163, 13.3777, 18],
    ["Sydney (southern hemisphere)", -33.8688, 151.2093, 12],
    ["equator / prime meridian", 0, 0, 10],
    ["London (negative longitude)", 51.5074, -0.1278, 16],
  ])("the returned tile actually contains the point: %s", (_name, lat, lng, zoom) => {
    const { x, y, z } = latLngToTile(lat, lng, zoom);
    const nw = tileToLatLng(x, y, z);
    const se = tileToLatLng(x + 1, y + 1, z);

    expect(lat).toBeLessThanOrEqual(nw.lat);
    expect(lat).toBeGreaterThanOrEqual(se.lat);
    expect(lng).toBeGreaterThanOrEqual(nw.lng);
    expect(lng).toBeLessThanOrEqual(se.lng);
  });

  test("pin offset percentages are always within the 0-100 range", () => {
    const { pinXPercent, pinYPercent } = latLngToTile(28.6139, 77.209, 15);
    expect(pinXPercent).toBeGreaterThanOrEqual(0);
    expect(pinXPercent).toBeLessThan(100);
    expect(pinYPercent).toBeGreaterThanOrEqual(0);
    expect(pinYPercent).toBeLessThan(100);
  });

  test("a point exactly on a tile boundary rounds into the tile to its east/south, not a negative or out-of-range offset", () => {
    // zoom 1 has an exact tile boundary at lng=0
    const { pinXPercent } = latLngToTile(0, 0, 1);
    expect(pinXPercent).toBeGreaterThanOrEqual(0);
    expect(pinXPercent).toBeLessThan(100);
  });
});

describe("tileUrl", () => {
  test("builds a standard OSM tile URL from x/y/z", () => {
    expect(tileUrl(23411, 13663, 15)).toBe("https://tile.openstreetmap.org/15/23411/13663.png");
  });
});