// Smart slot suggestion: for each weekday and hour, how likely is a pickup
// booked then to be taken quickly near this requester? Built from how many
// nearby collectors are actually working that hour, nudged by how often
// past scheduled pickups nearby got accepted at that time of day.
// Pure (no DB, no clock) so the maths is in one place.

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

// A collector who hasn't set working hours might still be around, but we
// can't know when, so they count for less than one who said "I'm on now".
const UNSCHEDULED_WEIGHT = 0.6;

// Enough past scheduled pickups around an hour before we let history move the score.
const MIN_HISTORY_SAMPLES = 5;

/** Does this collector's schedule cover this weekday + hour? Returns a weight 0..1. */
function availabilityWeight(avail, day, hour) {
  if (!avail?.enabled) return UNSCHEDULED_WEIGHT;
  const entry = (avail.schedule || []).find((s) => s.day === day);
  if (!entry) return 0;
  const from = toMinutes(entry.start);
  const to = toMinutes(entry.end);
  // Covered when the hour overlaps their working span at all.
  return hour * 60 < to && (hour + 1) * 60 > from ? 1 : 0;
}

/**
 * @param {object} p
 * @param {Array<{ availabilitySchedule?: object }>} p.collectors - approved collectors seen nearby
 * @param {Array<{ hour: number, accepted: boolean }>} p.history - past scheduled pickups nearby (hour in local time)
 * @returns {{ enough: boolean, collectorCount: number, scores?: number[][], usedHistory?: boolean }}
 */
function buildSlotScores({ collectors, history = [] }) {
  if (!collectors || collectors.length === 0) return { enough: false, collectorCount: 0 };

  // Accept rate per hour, smoothed over the hour either side.
  const accept = new Array(24).fill(null);
  let usedHistory = false;
  for (let h = 0; h < 24; h++) {
    const near = history.filter((r) => Math.min((r.hour - h + 24) % 24, (h - r.hour + 24) % 24) <= 1);
    if (near.length >= MIN_HISTORY_SAMPLES) {
      accept[h] = near.filter((r) => r.accepted).length / near.length;
      usedHistory = true;
    }
  }

  const scores = [];
  for (let day = 0; day < 7; day++) {
    const row = [];
    for (let hour = 0; hour < 24; hour++) {
      const supply = collectors.reduce((sum, c) => sum + availabilityWeight(c.availabilitySchedule, day, hour), 0);
      // Diminishing returns: the 5th collector adds far less than the 1st.
      let score = 100 * (1 - Math.exp(-supply / 2));
      if (accept[hour] != null) score *= 0.6 + 0.4 * accept[hour];
      row.push(Math.round(score));
    }
    scores.push(row);
  }
  return { enough: true, collectorCount: collectors.length, scores, usedHistory };
}

module.exports = { buildSlotScores, availabilityWeight, MIN_HISTORY_SAMPLES };