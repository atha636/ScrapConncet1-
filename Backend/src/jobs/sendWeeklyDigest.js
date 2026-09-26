const User = require("../models/User");
const Pickup = require("../models/Pickup");
const Transaction = require("../models/Transaction");
const Rating = require("../models/Rating");
const { sendEmail, wrapEmail } = require("../utils/sendEmail");

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const DAY_MS = 24 * 60 * 60 * 1000;

async function buildCollectorDigest(collectorId, since) {
  const [completedCount, earningsAgg, ratingAgg] = await Promise.all([
    Pickup.countDocuments({ collector: collectorId, status: "completed", updatedAt: { $gte: since } }),
    Transaction.aggregate([
      { $match: { collector: collectorId, type: "earning", createdAt: { $gte: since } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    Rating.aggregate([
      { $match: { toUser: collectorId, createdAt: { $gte: since } } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$score" } } },
    ]),
  ]);

  // Nothing completed this week — deliberately no email at all rather
  // than a "you did nothing this week" summary. A digest of zero
  // activity isn't useful information, it's just a guilt-trip, and it's
  // also the fastest way to train someone to ignore or unsubscribe from
  // every digest that follows.
  if (completedCount === 0) return null;

  return {
    completedCount,
    earned: earningsAgg[0]?.sum || 0,
    ratingCount: ratingAgg[0]?.count || 0,
    avgRating: ratingAgg[0]?.avg || null,
  };
}

async function buildRequesterDigest(requesterId, since) {
  const completed = await Pickup.find({
    user: requesterId,
    status: "completed",
    updatedAt: { $gte: since },
  }).select("items");

  if (completed.length === 0) return null;

  // `items` is always populated by the time a pickup is saved (see
  // Pickup's own pre-save hook backfilling it from the legacy top-level
  // scrapType/estimatedWeightKg fields), so this never needs a fallback
  // to those top-level fields the way an older, pre-items-array reader
  // might.
  const totalWeightKg = completed.reduce(
    (sum, p) => sum + p.items.reduce((s, it) => s + (it.estimatedWeightKg || 0), 0),
    0
  );

  return { completedCount: completed.length, totalWeightKg: Math.round(totalWeightKg * 10) / 10 };
}

/**
 * Weekly activity summary — a real digest that mirrors the actual state
 * of the account, not a scheduled marketing touch. Scoped tightly to what
 * this app can actually vouch for: pickups completed, money earned or
 * weight recycled, and ratings received — no invented "CO2 saved" figure,
 * since nothing in this codebase tracks an emission factor to back that
 * kind of claim with.
 *
 * Runs via node-cron's own `timezone` option (see server.js), not a
 * manual day-of-week check here — same Asia/Kolkata zone the rest of the
 * app's day/hour-sensitive logic already uses.
 */
async function sendWeeklyDigest() {
  const since = new Date(Date.now() - 7 * DAY_MS);
  let sent = 0;

  // { $ne: false } rather than { $eq: true } — matches both an explicit
  // opt-in and a pre-existing account that predates this field entirely
  // (absent in the stored document, so schema default: true applies once
  // hydrated, but the raw Mongo query itself only ever sees "not
  // explicitly false" without hydration). Getting this backwards would
  // silently skip every account that hasn't touched their notification
  // settings since this shipped — which, on day one, is all of them.
  const collectors = await User.find({ role: "collector", weeklyDigestOptIn: { $ne: false }, isActive: true });
  for (const collector of collectors) {
    const digest = await buildCollectorDigest(collector._id, since);
    if (!digest) continue;

    const ratingLine =
      digest.ratingCount > 0
        ? `You also picked up <strong>${digest.ratingCount}</strong> new rating${digest.ratingCount === 1 ? "" : "s"}, averaging <strong>${digest.avgRating.toFixed(1)}★</strong>.<br/><br/>`
        : "";

    await sendEmail({
      to: collector.email,
      subject: `Your week on ScrapConnect: ${digest.completedCount} pickup${digest.completedCount === 1 ? "" : "s"} done`,
      html: wrapEmail(
        "Your week in review",
        `Hi ${collector.name}, here's how your week went:<br/><br/>` +
          `<strong>${digest.completedCount}</strong> pickup${digest.completedCount === 1 ? "" : "s"} completed<br/>` +
          `<strong>₹${digest.earned}</strong> earned<br/><br/>` +
          ratingLine,
        "Open dashboard",
        `${CLIENT_ORIGIN}/collector`
      ),
    });
    sent += 1;
  }

  const requesters = await User.find({ role: "user", weeklyDigestOptIn: { $ne: false }, isActive: true });
  for (const requester of requesters) {
    const digest = await buildRequesterDigest(requester._id, since);
    if (!digest) continue;

    const weightLine =
      digest.totalWeightKg > 0
        ? `<strong>${digest.totalWeightKg}kg</strong> of scrap recycled<br/><br/>`
        : "";

    await sendEmail({
      to: requester.email,
      subject: `Your week on ScrapConnect: ${digest.completedCount} pickup${digest.completedCount === 1 ? "" : "s"} recycled`,
      html: wrapEmail(
        "Your week in review",
        `Hi ${requester.name}, here's your recycling summary for the week:<br/><br/>` +
          `<strong>${digest.completedCount}</strong> pickup${digest.completedCount === 1 ? "" : "s"} completed<br/>` +
          weightLine,
        "View my requests",
        `${CLIENT_ORIGIN}/my-requests`
      ),
    });
    sent += 1;
  }

  return sent;
}

module.exports = { sendWeeklyDigest };