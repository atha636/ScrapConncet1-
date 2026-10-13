const { haversineKm } = require("./routeOptimizer");

const AVG_SPEED_KMH = 20; // rough city average — an estimate, not a route
// Within this distance the collector counts as "almost there".
const ARRIVING_KM = 0.5;

// Minutes, rounded up to the nearest 5 so it doesn't pretend to be more
// precise than "distance ÷ typical speed" really is. Same convention as the
// quotes screen.
const etaMinutes = (km) => Math.max(5, Math.ceil(((km / AVG_SPEED_KMH) * 60) / 5) * 5);

function etaBetween(from, to) {
  const distanceKm = haversineKm(from, to);
  return { distanceKm: Math.round(distanceKm * 100) / 100, etaMinutes: etaMinutes(distanceKm) };
}

module.exports = { etaBetween, etaMinutes, ARRIVING_KM, AVG_SPEED_KMH };