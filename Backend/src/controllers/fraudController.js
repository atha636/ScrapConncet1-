const Pickup = require("../models/Pickup");
const User = require("../models/User");
const Rating = require("../models/Rating");
const Dispute = require("../models/Dispute");
const FraudReview = require("../models/FraudReview");
const asyncHandler = require("../utils/asyncHandler");
const { logAudit } = require("../utils/audit");
const { NO_SHOW_SUSPENSION_THRESHOLD } = require("../utils/reliabilityRules");
const signals = require("../utils/fraudSignals");

const WINDOW_DAYS = 60;
const ROW_LIMIT = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

const bump = (map, id, by = 1) => map.set(id, (map.get(id) || 0) + by);

// GET /api/fraud/flags  (admin)
//
// Runs the fraud-watch rules over the last 60 days and returns accounts
// worth a look, most serious first. Read-only: it never suspends or
// changes anyone — an admin reviews the evidence and acts through the
// normal admin tools.
async function computeFlags() {
  const now = Date.now();
  const since = new Date(now - WINDOW_DAYS * DAY_MS);
  const dayAgo = new Date(now - DAY_MS);

  const [cancelled, involvedRows, noShowUsers, ratingRows, disputeRows, burstRows, completed] = await Promise.all([
    Pickup.find({ status: "cancelled", createdAt: { $gte: since } })
      .select("statusHistory")
      .limit(ROW_LIMIT)
      .lean(),
    Pickup.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $facet: {
          asRequester: [{ $group: { _id: "$user", n: { $sum: 1 } } }],
          asCollector: [{ $match: { collector: { $ne: null } } }, { $group: { _id: "$collector", n: { $sum: 1 } } }],
      } },
    ]),
    User.find({ role: "collector", noShowCount: { $gte: 2 } }).select("noShowCount collectorSuspended").lean(),
    Rating.find({ createdAt: { $gte: since } }).select("fromUser toUser score").limit(ROW_LIMIT).lean(),
    Dispute.find({ createdAt: { $gte: since } })
      .select("reportedBy reason pickup")
      .populate("pickup", "collector")
      .limit(ROW_LIMIT)
      .lean(),
    Pickup.aggregate([
      { $match: { createdAt: { $gte: dayAgo } } },
      { $group: { _id: "$user", n: { $sum: 1 } } },
      { $match: { n: { $gte: 8 } } },
    ]),
    Pickup.find({ status: "completed", collector: { $ne: null }, createdAt: { $gte: since } })
      .select("user collector")
      .populate("user", "phone")
      .populate("collector", "phone")
      .limit(3000)
      .lean(),
  ]);

  const involvedByUser = new Map();
  for (const r of involvedRows[0]?.asRequester || []) bump(involvedByUser, String(r._id), r.n);
  for (const r of involvedRows[0]?.asCollector || []) bump(involvedByUser, String(r._id), r.n);

  // Who cancelled: the account on the last "cancelled" history entry.
  const cancelledByUser = new Map();
  for (const p of cancelled) {
    const last = [...(p.statusHistory || [])].reverse().find((h) => h.status === "cancelled");
    if (last?.changedBy) bump(cancelledByUser, String(last.changedBy));
  }

  const disputesByUser = new Map();
  const paymentByCollector = new Map();
  for (const d of disputeRows) {
    bump(disputesByUser, String(d.reportedBy));
    if (d.reason === "payment_issue" && d.pickup?.collector) bump(paymentByCollector, String(d.pickup.collector));
  }

  const found = [
    ...signals.cancellationAbuse({ cancelledByUser, involvedByUser }),
    ...signals.noShows({
      collectors: noShowUsers.map((u) => ({ id: String(u._id), noShowCount: u.noShowCount, suspended: !!u.collectorSuspended })),
      threshold: NO_SHOW_SUSPENSION_THRESHOLD,
    }),
    ...signals.ratingBoost({ ratings: ratingRows.map((r) => ({ from: String(r.fromUser), to: String(r.toUser), score: r.score })) }),
    ...signals.disputeHeavy({ disputesByUser, involvedByUser }),
    ...signals.paymentDisputes({ byCollector: paymentByCollector }),
    ...signals.burstRequests({ countsLast24h: new Map(burstRows.map((b) => [String(b._id), b.n])) }),
    ...signals.selfDealing({
      pickups: completed
        .filter((p) => p.user && p.collector)
        .map((p) => ({
          userId: String(p.user._id),
          collectorId: String(p.collector._id),
          userPhone: p.user.phone,
          collectorPhone: p.collector.phone,
        })),
    }),
  ].map((f) => ({ ...f, key: signals.flagKey(f) }));

  // Hide what an admin already reviewed, unless it has got worse since.
  const reviews = await FraudReview.find({ key: { $in: found.map((f) => f.key) } }).lean();
  const reviewedAt = new Map(reviews.map((r) => [r.key, r.evidenceCount]));
  const open = found.filter((f) => !(reviewedAt.has(f.key) && reviewedAt.get(f.key) >= f.evidenceCount));

  const ids = [...new Set(open.flatMap((f) => [f.userId, f.otherUserId].filter(Boolean)))];
  const users = await User.find({ _id: { $in: ids } }).select("name role phone isActive collectorSuspended").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const person = (id) => {
    const u = byId.get(id);
    return u ? { id, name: u.name, role: u.role, phone: u.phone || null, active: u.isActive !== false, suspended: !!u.collectorSuspended } : null;
  };

  const rank = { high: 0, medium: 1 };
  const flags = open
    .map((f) => ({
      key: f.key,
      type: f.type,
      severity: f.severity,
      title: f.title,
      detail: f.detail,
      evidenceCount: f.evidenceCount,
      user: person(f.userId),
      other: f.otherUserId ? person(f.otherUserId) : null,
    }))
    .filter((f) => f.user)
    .sort((a, b) => rank[a.severity] - rank[b.severity] || b.evidenceCount - a.evidenceCount);

  return {
    windowDays: WINDOW_DAYS,
    highCount: flags.filter((f) => f.severity === "high").length,
    flags,
  };
}

exports.computeFlags = computeFlags;

exports.getFlags = asyncHandler(async (req, res) => {
  res.json(await computeFlags());
});

// POST /api/fraud/flags/review  (admin)
exports.reviewFlag = asyncHandler(async (req, res) => {
  const { key, evidenceCount, note } = req.body;
  await FraudReview.findOneAndUpdate(
    { key },
    { key, evidenceCount, note: note || "", reviewedBy: req.user.id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await logAudit(req, { action: "fraud.review", targetType: "FraudFlag", targetLabel: key, details: { evidenceCount, note: note || undefined } });
  res.json({ key, reviewed: true });
});