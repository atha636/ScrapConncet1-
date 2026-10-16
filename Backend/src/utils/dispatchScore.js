// Smart dispatch: one 0–100 "match" score per nearby collector for a
// specific pending pickup, so the requester's list is ordered by who is
// actually the best fit — not just who is physically closest.
//
// Pure (no DB access) so the weights live in one place and the numbers
// the list shows can't drift from how it's sorted.

const RADIUS_KM = 25;

// What a collector with no history is assumed to be. A brand-new collector
// shouldn't start at the bottom (never gets a job → never gets history), but
// shouldn't beat a proven 4.8★ either — so unknowns score as "decent".
const PRIOR_RATING = 4.0;
const PRIOR_RATING_WEIGHT = 3; // acts like 3 pretend ratings of PRIOR_RATING
const PRIOR_COMPLETION_RATE = 0.8;
const PRIOR_SPEED = 0.5;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * @param {object} c
 * @param {number} c.distanceKm
 * @param {number} c.rating - average, 0 when unrated
 * @param {number} c.ratingCount
 * @param {number|null} c.completionRate - 0..1, null when not enough history
 * @param {number|null} c.avgAcceptMinutes - null when not enough history
 * @param {number} c.similarCompleted - completed pickups with this scrap type
 * @param {boolean|null} c.handles - declared scrap types fit (true), don't (false), unstated (null)
 * @returns {{ score: number, reasons: string[] }}
 */
function scoreCollector({
  distanceKm,
  rating,
  ratingCount,
  completionRate,
  avgAcceptMinutes,
  similarCompleted,
  handles,
}) {
  const proximity = clamp01(1 - distanceKm / RADIUS_KM);

  const bayes = (rating * ratingCount + PRIOR_RATING * PRIOR_RATING_WEIGHT) / (ratingCount + PRIOR_RATING_WEIGHT);
  const ratingPart = clamp01((bayes - 1) / 4);

  const reliability = completionRate == null ? PRIOR_COMPLETION_RATE : completionRate;
  const speed = avgAcceptMinutes == null ? PRIOR_SPEED : clamp01(1 - avgAcceptMinutes / 60);
  const experience = clamp01(similarCompleted / 5);

  let score =
    proximity * 35 +
    ratingPart * 25 +
    reliability * 15 +
    experience * 10 +
    (handles === true ? 5 : 0) +
    speed * 10;

  // Told the app they don't take this kind of scrap: a guaranteed wasted
  // round trip, so halve the score rather than just nudging it.
  if (handles === false) score *= 0.5;

  const reasons = [];
  if (handles === true) reasons.push("Collects this scrap");
  if (similarCompleted >= 1) reasons.push(`${similarCompleted} similar pickup${similarCompleted === 1 ? "" : "s"} done`);
  if (ratingCount >= 3 && rating >= 4.5) reasons.push("Top rated");
  if (completionRate != null && completionRate >= 0.9) reasons.push("Very reliable");
  if (avgAcceptMinutes != null && avgAcceptMinutes <= 15) reasons.push("Fast to respond");

  return { score: Math.round(score), reasons };
}

// A list's top entry is only called "Best match" when it is actually a good
// one: a decent score and not a collector who said they don't take this.
const BEST_MATCH_MIN_SCORE = 50;
const isBestMatch = (entry) => entry.matchScore >= BEST_MATCH_MIN_SCORE && entry.handlesPickup !== false;

module.exports = { scoreCollector, isBestMatch, BEST_MATCH_MIN_SCORE, RADIUS_KM };