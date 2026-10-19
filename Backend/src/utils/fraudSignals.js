// Fraud and abuse watch: plain rules over recent platform activity that
// surface accounts an admin should look at. Nothing here punishes anyone —
// each rule only produces a flag with its evidence, and a human decides.
// Pure (no DB) so the thresholds live in one place and are easy to tune.

const sev = (n, highAt) => (n >= highAt ? "high" : "medium");

const flag = (f) => ({ otherUserId: null, ...f });

/** Many cancellations, and most of this person's pickups end that way. */
function cancellationAbuse({ cancelledByUser, involvedByUser }) {
  const out = [];
  for (const [userId, cancelled] of cancelledByUser) {
    const involved = involvedByUser.get(userId) || cancelled;
    const rate = cancelled / involved;
    if (cancelled >= 4 && rate >= 0.5) {
      out.push(
        flag({
          type: "cancellations",
          userId,
          severity: sev(cancelled, 8),
          evidenceCount: cancelled,
          title: "Cancels most of their pickups",
          detail: `Cancelled ${cancelled} of ${involved} pickups (${Math.round(rate * 100)}%) in the last 60 days.`,
        })
      );
    }
  }
  return out;
}

/** Collectors who've been reported as no-shows more than once and aren't suspended yet. */
function noShows({ collectors, threshold }) {
  return collectors
    .filter((c) => c.noShowCount >= 2 && !c.suspended)
    .map((c) =>
      flag({
        type: "no_shows",
        userId: c.id,
        severity: c.noShowCount >= threshold - 1 ? "high" : "medium",
        evidenceCount: c.noShowCount,
        title: "Repeated no-shows",
        detail: `${c.noShowCount} confirmed no-shows. Auto-suspension is at ${threshold}.`,
      })
    );
}

/**
 * Ratings that look arranged: one person giving the same account many 5★
 * ratings, or two accounts rating each other highly again and again.
 */
function ratingBoost({ ratings }) {
  const pair = new Map(); // "from>to" -> { high, five }
  for (const r of ratings) {
    const k = `${r.from}>${r.to}`;
    const p = pair.get(k) || { high: 0, five: 0 };
    if (r.score >= 4) p.high += 1;
    if (r.score === 5) p.five += 1;
    pair.set(k, p);
  }
  const out = [];
  const seenMutual = new Set();
  for (const [k, p] of pair) {
    const [from, to] = k.split(">");
    const back = pair.get(`${to}>${from}`);
    if (back && p.high >= 2 && back.high >= 2) {
      const mk = [from, to].sort().join("|");
      if (!seenMutual.has(mk)) {
        seenMutual.add(mk);
        const n = Math.min(p.high, back.high);
        for (const [a, b] of [[from, to], [to, from]]) {
          out.push(
            flag({
              type: "mutual_ratings",
              userId: a,
              otherUserId: b,
              severity: sev(n, 4),
              evidenceCount: n,
              title: "Mutual high ratings with one account",
              detail: `They and the account below each gave the other ${n}+ ratings of 4★ or more.`,
            })
          );
        }
      }
    } else if (p.five >= 4) {
      out.push(
        flag({
          type: "repeat_five_star",
          userId: to,
          otherUserId: from,
          severity: sev(p.five, 6),
          evidenceCount: p.five,
          title: "Same account keeps giving 5★",
          detail: `The account below gave this one ${p.five} five-star ratings.`,
        })
      );
    }
  }
  return out;
}

/** Someone who disputes a large share of their pickups. */
function disputeHeavy({ disputesByUser, involvedByUser }) {
  const out = [];
  for (const [userId, n] of disputesByUser) {
    const involved = involvedByUser.get(userId) || n;
    const rate = n / involved;
    if (n >= 3 && rate >= 0.4) {
      out.push(
        flag({
          type: "dispute_heavy",
          userId,
          severity: sev(n, 6),
          evidenceCount: n,
          title: "Disputes a large share of pickups",
          detail: `Opened ${n} disputes across ${involved} pickups (${Math.round(rate * 100)}%) in the last 60 days.`,
        })
      );
    }
  }
  return out;
}

/** A collector the requesters keep saying didn't pay. */
function paymentDisputes({ byCollector }) {
  const out = [];
  for (const [userId, n] of byCollector) {
    if (n >= 2) {
      out.push(
        flag({
          type: "payment_disputes",
          userId,
          severity: sev(n, 3),
          evidenceCount: n,
          title: "Payment reported as not received",
          detail: `${n} requesters reported not receiving payment in the last 60 days.`,
        })
      );
    }
  }
  return out;
}

/** An unusual number of requests from one account in a day. */
function burstRequests({ countsLast24h }) {
  const out = [];
  for (const [userId, n] of countsLast24h) {
    if (n >= 8) {
      out.push(
        flag({
          type: "burst_requests",
          userId,
          severity: sev(n, 15),
          evidenceCount: n,
          title: "Unusually many requests today",
          detail: `Created ${n} pickup requests in the last 24 hours.`,
        })
      );
    }
  }
  return out;
}

const lastTen = (p) => String(p || "").replace(/\D/g, "").slice(-10);

/** Requester and collector sharing a phone number — likely one person on both sides. */
function selfDealing({ pickups }) {
  const byPair = new Map();
  for (const p of pickups) {
    const a = lastTen(p.userPhone);
    const b = lastTen(p.collectorPhone);
    if (a.length === 10 && a === b) {
      const k = `${p.userId}>${p.collectorId}`;
      byPair.set(k, (byPair.get(k) || 0) + 1);
    }
  }
  const out = [];
  for (const [k, n] of byPair) {
    const [userId, collectorId] = k.split(">");
    for (const [a, b] of [[userId, collectorId], [collectorId, userId]]) {
      out.push(
        flag({
          type: "self_dealing",
          userId: a,
          otherUserId: b,
          severity: "high",
          evidenceCount: n,
          title: "Both sides share a phone number",
          detail: `${n} completed pickup${n === 1 ? "" : "s"} where the requester and collector have the same phone number.`,
        })
      );
    }
  }
  return out;
}

// Stable identity of a flag, so a review sticks to the same issue.
const flagKey = (f) => `${f.type}:${f.userId}${f.otherUserId ? `:${f.otherUserId}` : ""}`;

module.exports = {
  cancellationAbuse,
  noShows,
  ratingBoost,
  disputeHeavy,
  paymentDisputes,
  burstRequests,
  selfDealing,
  flagKey,
};