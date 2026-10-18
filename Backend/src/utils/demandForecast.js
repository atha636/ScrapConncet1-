// Demand forecast for collectors: "when is it busy, and where". Built from
// where and when pickup requests were created over the last few weeks — the
// same pickups the demand heatmap already reads, just looked at over time.
// Pure (no DB, no clock of its own) so the maths is testable in one place.

const { haversineKm } = require("./routeOptimizer");

const KM_PER_LAT_DEGREE = 110.574;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Same hour on a different weekday still says something about demand, just
// less than the same weekday does.
const OTHER_DAY_WEIGHT = 0.35;

// Too little history to say anything honest.
const MIN_EVENTS = 8;

const LOW_CONFIDENCE_BELOW = 15;
const HIGH_CONFIDENCE_AT = 60;

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * @param {object} p
 * @param {Array<{createdAt: Date, lat: number, lng: number}>} p.events - pickup requests created nearby, newest history
 * @param {Date} p.now
 * @param {{lat:number,lng:number}} p.collector
 * @param {number} [p.cellKm=2] - area size; coarse on purpose so no single pickup can be pinpointed
 * @param {number} [p.tzOffsetMinutes=330] - local time zone (IST, no daylight saving)
 * @param {number} [p.minCellEvents=3] - an area needs this many past requests in the window to be named
 */
function buildForecast({ events, now, collector, cellKm = 2, tzOffsetMinutes = 330, minCellEvents = 3 }) {
  if (!events || events.length < MIN_EVENTS) {
    return { enough: false, sampleSize: events ? events.length : 0 };
  }

  const local = (d) => new Date(d.getTime() + tzOffsetMinutes * 60 * 1000);
  const nowLocal = local(now);
  const today = nowLocal.getUTCDay();
  const hourNow = nowLocal.getUTCHours();

  const oldest = events.reduce((m, e) => Math.min(m, e.createdAt.getTime()), Infinity);
  const weeksCovered = Math.max(1, Math.min(8, Math.ceil((now.getTime() - oldest) / WEEK_MS)));

  // Expected requests per week for each hour of today's weekday.
  const hours = new Array(24).fill(0);
  for (const e of events) {
    const l = local(e.createdAt);
    if (l.getUTCDay() === today) hours[l.getUTCHours()] += 1;
  }
  for (let h = 0; h < 24; h++) hours[h] = round1(hours[h] / weeksCovered);

  // Best 2-hour windows today (non-overlapping), busiest first.
  const windows = [];
  for (let h = 0; h < 23; h++) windows.push({ start: h, end: h + 2, expected: round1(hours[h] + hours[h + 1]) });
  windows.sort((a, b) => b.expected - a.expected);
  const bestWindows = [];
  for (const w of windows) {
    if (w.expected <= 0) break;
    if (bestWindows.every((b) => w.start >= b.end || w.end <= b.start)) bestWindows.push(w);
    if (bestWindows.length === 2) break;
  }

  const peak = Math.max(...hours);
  const nowShare = peak > 0 ? hours[hourNow] / peak : 0;
  const nowLevel = nowShare >= 0.7 ? "busy" : nowShare >= 0.35 ? "moderate" : "quiet";

  // Where: requests in the hour either side of now, grouped into coarse areas.
  const latStep = cellKm / KM_PER_LAT_DEGREE;
  const lngStep = cellKm / (KM_PER_LAT_DEGREE * Math.cos((collector.lat * Math.PI) / 180) || 1);
  const cells = new Map();
  for (const e of events) {
    const l = local(e.createdAt);
    const h = l.getUTCHours();
    const diff = Math.min((h - hourNow + 24) % 24, (hourNow - h + 24) % 24);
    if (diff > 1) continue;
    const x = Math.floor(e.lng / lngStep);
    const y = Math.floor(e.lat / latStep);
    const key = `${x}_${y}`;
    const weight = l.getUTCDay() === today ? 1 : OTHER_DAY_WEIGHT;
    const cell = cells.get(key) || { x, y, count: 0, score: 0 };
    cell.count += 1;
    cell.score += weight;
    cells.set(key, cell);
  }

  const areas = [...cells.values()]
    .filter((c) => c.count >= minCellEvents)
    .map((c) => {
      const lat = Number(((c.y + 0.5) * latStep).toFixed(4));
      const lng = Number(((c.x + 0.5) * lngStep).toFixed(4));
      return {
        lat,
        lng,
        expected: round1(c.score / weeksCovered),
        distanceKm: Number(haversineKm(collector, { lat, lng }).toFixed(1)),
      };
    })
    .sort((a, b) => b.expected - a.expected || a.distanceKm - b.distanceKm)
    .slice(0, 3);

  const sampleSize = events.length;
  const confidence = sampleSize < LOW_CONFIDENCE_BELOW ? "low" : sampleSize >= HIGH_CONFIDENCE_AT ? "high" : "medium";

  return { enough: true, sampleSize, weeksCovered, confidence, hourNow, hours, bestWindows, nowLevel, areas, cellKm };
}

module.exports = { buildForecast, MIN_EVENTS };