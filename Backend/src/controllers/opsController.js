const Pickup = require("../models/Pickup");
const User = require("../models/User");
const Dispute = require("../models/Dispute");
const PayoutRequest = require("../models/PayoutRequest");
const SupportTicket = require("../models/SupportTicket");
const SafetyAlert = require("../models/SafetyAlert");
const asyncHandler = require("../utils/asyncHandler");
const { computeFlags } = require("./fraudController");

const MIN_MS = 60 * 1000;
const IST_OFFSET_MS = 330 * MIN_MS; // India-only, same simplification as collectorAvailability

// A pickup nobody has taken this long is worth a look; matches the
// "unpaid" and "claimed" reminder windows used by the payment reminder job.
const UNACCEPTED_WARN_MIN = 30;
const UNPAID_WARN_HOURS = 6;
const UNCONFIRMED_WARN_HOURS = 12;

// Counting fraud flags runs several wide queries, so the ops screen (which
// refreshes every 20 seconds) reuses a recent result instead of redoing it.
const FRAUD_CACHE_MS = 5 * MIN_MS;
let fraudCache = { at: 0, high: 0 };

async function fraudHighCount() {
  if (Date.now() - fraudCache.at < FRAUD_CACHE_MS) return fraudCache.high;
  try {
    const { highCount } = await computeFlags();
    fraudCache = { at: Date.now(), high: highCount };
  } catch (err) {
    console.error("Ops: fraud count failed:", err.message);
  }
  return fraudCache.high;
}

const startOfTodayIST = (now) => {
  const local = new Date(now.getTime() + IST_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - IST_OFFSET_MS);
};

// GET /api/admin/ops  (admin)
//
// Everything an admin needs to see at a glance: today's activity, what's
// happening live, and a ranked list of things that need attention, each
// pointing at the admin tab where it's handled. Read-only counts and short
// lists — no personal details beyond a first name and scrap type.
exports.getOps = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = startOfTodayIST(now);
  const unacceptedBefore = new Date(now.getTime() - UNACCEPTED_WARN_MIN * MIN_MS);
  const unpaidBefore = new Date(now.getTime() - UNPAID_WARN_HOURS * 60 * MIN_MS);
  const unconfirmedBefore = new Date(now.getTime() - UNCONFIRMED_WARN_HOURS * 60 * MIN_MS);

  const [
    requestsToday,
    completedToday,
    cancelledToday,
    pending,
    urgent,
    active,
    stalled,
    oldestPending,
    sos,
    openDisputes,
    paymentDisputes,
    unpaid,
    unconfirmed,
    settlementDisputes,
    payouts,
    verifications,
    support,
    slowPending,
    fraudHigh,
  ] = await Promise.all([
    Pickup.countDocuments({ createdAt: { $gte: today } }),
    Pickup.countDocuments({ status: "completed", updatedAt: { $gte: today } }),
    Pickup.countDocuments({ status: "cancelled", updatedAt: { $gte: today } }),
    Pickup.countDocuments({ status: "pending" }),
    Pickup.countDocuments({ status: "pending", isUrgent: true }),
    Pickup.countDocuments({ status: { $in: ["accepted", "in_progress"] } }),
    Pickup.countDocuments({ status: { $in: ["accepted", "in_progress"] }, isStalled: true }),
    Pickup.findOne({ status: "pending" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    SafetyAlert.countDocuments({ status: "active" }),
    Dispute.countDocuments({ status: "open" }),
    Dispute.countDocuments({ status: "open", reason: "payment_issue" }),
    Pickup.countDocuments({ status: "completed", "payment.status": "unpaid", "settlement.status": { $in: ["none", "auto_confirmed", "confirmed", "resolved"] }, updatedAt: { $lt: unpaidBefore, $gte: new Date(now.getTime() - 14 * 24 * 60 * MIN_MS) } }),
    Pickup.countDocuments({ "payment.status": "claimed", "payment.claimedAt": { $lt: unconfirmedBefore } }),
    Pickup.countDocuments({ "settlement.status": "disputed" }),
    PayoutRequest.countDocuments({ status: "pending" }),
    User.countDocuments({ role: "collector", "collectorVerification.status": "pending" }),
    SupportTicket.countDocuments({ status: "open" }),
    Pickup.find({ status: "pending", createdAt: { $lt: unacceptedBefore } })
      .sort({ createdAt: 1 })
      .limit(5)
      .select("scrapType price createdAt isUrgent user")
      .populate("user", "name")
      .lean(),
    fraudHighCount(),
  ]);

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const items = [
    { key: "sos", tab: "safety", severity: "critical", count: sos, label: "Active SOS alerts", hint: "Someone pressed SOS. Respond first." },
    { key: "disputes", tab: "disputes", severity: "high", count: openDisputes, label: "Open disputes", hint: paymentDisputes ? `${plural(paymentDisputes, "is a payment issue", "are payment issues")}.` : "Waiting for an admin decision." },
    { key: "fraud", tab: "fraud", severity: "high", count: fraudHigh, label: "High-risk fraud flags", hint: "Accounts worth a closer look." },
    { key: "unconfirmed", tab: "pickups", severity: "medium", count: unconfirmed, label: "Payments awaiting the requester", hint: `Collector says paid; no confirmation after ${UNCONFIRMED_WARN_HOURS} hours.` },
    { key: "settlement", tab: "disputes", severity: "medium", count: settlementDisputes, label: "Disputed final prices", hint: "Requester disagreed with the weighed amount." },
    { key: "unpaid", tab: "pickups", severity: "medium", count: unpaid, label: "Completed but unpaid", hint: `Collector hasn't marked payment after ${UNPAID_WARN_HOURS} hours.` },
    { key: "stalled", tab: "pickups", severity: "medium", count: stalled, label: "Stalled pickups", hint: "Accepted, but the collector hasn't moved." },
    { key: "urgent", tab: "pickups", severity: "medium", count: urgent, label: "Urgent unaccepted pickups", hint: "Pending too long; no collector has taken them." },
    { key: "payouts", tab: "payouts", severity: "low", count: payouts, label: "Payout requests to review", hint: "Collectors waiting to be paid out." },
    { key: "verifications", tab: "verifications", severity: "low", count: verifications, label: "IDs waiting for approval", hint: "Collectors can't accept pickups until approved." },
    { key: "support", tab: "support", severity: "low", count: support, label: "Open support tickets", hint: "Waiting for a reply." },
  ].filter((i) => i.count > 0);

  res.json({
    generatedAt: now,
    today: { requests: requestsToday, completed: completedToday, cancelled: cancelledToday },
    live: {
      pending,
      urgent,
      active,
      stalled,
      oldestPendingMinutes: oldestPending ? Math.round((now - oldestPending.createdAt) / MIN_MS) : null,
    },
    attention: items,
    waiting: slowPending.map((p) => ({
      id: p._id,
      scrapType: p.scrapType,
      price: p.price,
      urgent: !!p.isUrgent,
      requester: p.user?.name ? p.user.name.split(" ")[0] : null,
      waitingMinutes: Math.round((now - p.createdAt) / MIN_MS),
    })),
  });
});