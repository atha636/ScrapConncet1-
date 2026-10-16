// Turns a scrap type's recorded rate changes into a plain-language trend.
// Platform rates only move when an admin edits them, so this describes where
// the rate has been — it does not predict the next change.

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;
const STEADY_BAND_PCT = 2;

/**
 * @param {{ratePerKg:number, changedAt:string|number|Date}[]} rows  one type's changes, any order
 * @param {number} current  rate per kg right now
 * @param {number} now      timestamp (ms)
 */
export function computeOutlook(rows, current, now) {
  if (typeof current !== "number") return null;

  const points = (rows || [])
    .map((r) => ({ t: new Date(r.changedAt).getTime(), v: r.ratePerKg }))
    .filter((p) => p.t >= now - WINDOW_DAYS * DAY && p.t <= now)
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) {
    return { trend: "steady", changePct: 0, tip: "Steady lately — no recent rate changes.", changes: 0, spark: null, current };
  }

  const cutoff = now - 30 * DAY;
  const before = points.filter((p) => p.t <= cutoff);
  const base = (before.length ? before[before.length - 1] : points[0]).v;
  const changePct = base > 0 ? Math.round(((current - base) / base) * 1000) / 10 : 0;

  const values = [...points.map((p) => p.v), current];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const position = max > min ? (current - min) / (max - min) : 0.5;

  const trend = changePct > STEADY_BAND_PCT ? "rising" : changePct < -STEADY_BAND_PCT ? "falling" : "steady";

  let tip = "Around its usual level lately.";
  if (max > min && position >= 0.8) tip = "Near its 90-day high — a good time to sell.";
  else if (max > min && position <= 0.2) tip = "Near its 90-day low — if you're not in a hurry, you may want to wait.";

  const start = now - WINDOW_DAYS * DAY;
  const spark = [{ t: start, v: points[0].v }, ...points.filter((p) => p.t > start), { t: now, v: current }];

  return { trend, changePct, tip, changes: points.length - 1, spark, min, max, current };
}

/** SVG path for a step line over the 90-day window, within a w×h box. */
export function sparkPath(spark, now, w = 100, h = 28, pad = 3) {
  if (!spark || spark.length < 2) return "";
  const start = now - WINDOW_DAYS * DAY;
  const vals = spark.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const x = (t) => ((t - start) / (WINDOW_DAYS * DAY)) * w;
  const y = (v) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2));

  let d = `M${x(spark[0].t).toFixed(1)},${y(spark[0].v).toFixed(1)}`;
  for (let i = 1; i < spark.length; i++) {
    d += ` H${x(spark[i].t).toFixed(1)} V${y(spark[i].v).toFixed(1)}`;
  }
  return d;
}