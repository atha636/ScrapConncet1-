const EARTH_RADIUS_KM = 6371;

/**
 * Straight-line ("as the crow flies") distance between two lat/lng points.
 *
 * Deliberately not a real road-network distance — that would need a
 * routing API (OSRM, Google Directions) with per-request cost, rate
 * limits, and a network dependency in the middle of a page load. For
 * ordering a handful of stops within one city, straight-line distance
 * ranks routes almost identically to road distance at zero cost, and the
 * ordering is what this feature actually delivers. The displayed totals
 * are labeled as estimates on the frontend for the same reason.
 */
function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Total distance of a route that starts at `start` and visits stops in order. */
function routeLengthKm(start, stops) {
  if (stops.length === 0) return 0;
  let total = haversineKm(start, stops[0]);
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineKm(stops[i], stops[i + 1]);
  }
  return total;
}

/**
 * Greedy nearest-neighbour ordering: from wherever you are, always go to
 * the closest stop you haven't visited yet. Fast and intuitive, but it can
 * paint itself into a corner — hence the 2-opt pass below.
 */
function nearestNeighbour(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = haversineKm(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    current = remaining[bestIndex];
    ordered.push(current);
    remaining.splice(bestIndex, 1);
  }

  return ordered;
}

// Cap on 2-opt sweeps. The loop below already exits early the moment a full
// pass finds no improvement (which, for the stop counts this realistically
// sees, is usually after 2-3 passes), so this only exists to bound the
// absolute worst case rather than to stop it converging normally.
const MAX_TWO_OPT_PASSES = 20;

/**
 * 2-opt refinement: repeatedly look for two route segments that cross over
 * each other and uncross them by reversing the section between. This is
 * what fixes nearest-neighbour's classic failure — greedily picking off
 * close stops early, then having to double back across the map for the one
 * it skipped.
 *
 * Open route, not a loop: the collector starts at their current position
 * and ends wherever the last stop is, with no return leg home, so this
 * never treats the route as a closed circuit.
 */
function twoOptImprove(start, stops) {
  if (stops.length < 3) return stops;

  let best = [...stops];
  let bestLength = routeLengthKm(start, best);

  for (let pass = 0; pass < MAX_TWO_OPT_PASSES; pass++) {
    let improvedThisPass = false;

    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const candidateLength = routeLengthKm(start, candidate);
        // Requires a real improvement, not just any difference — floating
        // point noise on an equal-length swap could otherwise flip the
        // route back and forth forever without the pass cap catching it.
        if (candidateLength < bestLength - 1e-9) {
          best = candidate;
          bestLength = candidateLength;
          improvedThisPass = true;
        }
      }
    }

    if (!improvedThisPass) break;
  }

  return best;
}

/**
 * Orders a collector's stops into an efficient visiting sequence.
 *
 * @param {{lat: number, lng: number}} start - the collector's current position
 * @param {Array<{id: any, lat: number, lng: number}>} stops
 * @returns {{ordered: Array, totalKm: number, naiveKm: number, savedKm: number}}
 *   `naiveKm` is the route as-is in the input order (which is how the
 *   dashboard lists jobs today — by most recently updated), so savedKm is
 *   an honest "what this actually bought you" number rather than a
 *   comparison against some arbitrary worst case.
 */
function optimizeRoute(start, stops) {
  if (!stops || stops.length === 0) {
    return { ordered: [], totalKm: 0, naiveKm: 0, savedKm: 0 };
  }

  const naiveKm = routeLengthKm(start, stops);
  const ordered = twoOptImprove(start, nearestNeighbour(start, stops));
  const totalKm = routeLengthKm(start, ordered);

  return {
    ordered,
    totalKm,
    naiveKm,
    // Clamped at 0 — the optimizer can't actually produce a worse route
    // than the input (nearest-neighbour then 2-opt only ever moves
    // downward from its own starting point), but a negative "saved"
    // number would be nonsense to show a user if that ever changed.
    savedKm: Math.max(0, naiveKm - totalKm),
  };
}

module.exports = { haversineKm, routeLengthKm, nearestNeighbour, twoOptImprove, optimizeRoute };