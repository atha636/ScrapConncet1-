const Pickup = require("../models/Pickup");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const toCsv = require("../utils/toCsv");
const { computeImpact } = require("../utils/impact");

// Same rule the receipt uses: only settled prices count as real.
const FINAL_SETTLEMENT = new Set(["none", "auto_confirmed", "confirmed", "resolved"]);

const round1 = (n) => Math.round(n * 10) / 10;

const currentMonth = () => new Date().toISOString().slice(0, 7);

// Express 5 makes req.query read-only, so the month is checked here rather
// than through the validate middleware.
function monthParam(req) {
  const m = req.query.month;
  if (m === undefined) return currentMonth();
  if (typeof m !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new ApiError(400, "Month must look like 2026-10");
  return m;
}

// [start, end) of a YYYY-MM month in UTC
function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  return [new Date(Date.UTC(y, m - 1, 1)), new Date(Date.UTC(y, m, 1))];
}

const completedAtOf = (p) =>
  p.statusHistory?.find((h) => h.status === "completed")?.changedAt || p.updatedAt;

// Weighed amounts when settlement captured them, otherwise the estimate.
function linesOf(p) {
  const actual = p.settlement?.actualItems || [];
  if (actual.length > 0) return actual.map((i) => ({ scrapType: i.scrapType, kg: i.actualWeightKg || 0 }));
  const items = p.items?.length ? p.items : [{ scrapType: p.scrapType, estimatedWeightKg: p.estimatedWeightKg }];
  return items.map((i) => ({ scrapType: i.scrapType, kg: i.estimatedWeightKg || 0 }));
}

async function requireBusiness(userId) {
  const user = await User.findById(userId);
  if (!user?.businessProfile?.enabled) throw new ApiError(403, "Set up your business account first");
  return user;
}

const profileOf = (user) => {
  const b = user.businessProfile;
  if (!b?.enabled) return { enabled: false };
  return {
    enabled: true,
    businessName: b.businessName,
    businessType: b.businessType,
    gstin: b.gstin || "",
    sites: (b.sites || []).map((s) => ({ id: s._id, label: s.label, address: s.address, lat: s.lat, lng: s.lng })),
  };
};

// GET /api/business/profile  (user)
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(profileOf(user));
});

// PUT /api/business/profile  (user) — creates or updates
exports.saveProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  const { businessName, businessType, gstin, sites } = req.body;

  user.businessProfile = {
    enabled: true,
    businessName,
    businessType,
    gstin: gstin || undefined,
    // Keep existing sites when the request doesn't send any
    sites: sites !== undefined ? sites : user.businessProfile?.sites || [],
  };
  await user.save();
  res.json(profileOf(user));
});

// Builds one month's report for a business account.
async function buildReport(userId, month) {
  const [start, end] = monthRange(month);
  const candidates = await Pickup.find({
    user: userId,
    status: "completed",
    statusHistory: { $elemMatch: { status: "completed", changedAt: { $gte: start, $lt: end } } },
  })
    .sort({ updatedAt: 1 })
    .limit(1000);

  const pickups = candidates.filter((p) => FINAL_SETTLEMENT.has(p.settlement?.status || "none"));

  const byType = {};
  const byDestination = {};
  let totalValue = 0;
  let bonus = 0;

  const rows = pickups.map((p) => {
    const lines = linesOf(p);
    const kg = lines.reduce((s, l) => s + l.kg, 0);
    for (const l of lines) byType[l.scrapType] = (byType[l.scrapType] || 0) + l.kg;
    const value = p.settlement?.finalPrice ?? p.price;
    totalValue += value;
    bonus += p.coupon?.bonusAmount || 0;
    const dest = p.dropOff?.partnerName ? `${p.dropOff.partnerName}${p.dropOff.partnerCity ? `, ${p.dropOff.partnerCity}` : ""}` : null;
    if (dest) byDestination[dest] = (byDestination[dest] || 0) + kg;
    return {
      pickupId: p._id,
      date: completedAtOf(p),
      site: p.location?.address || "—",
      materials: [...new Set(lines.map((l) => l.scrapType))].join(", "),
      kg: round1(kg),
      value,
      destination: dest,
    };
  });

  const impact = computeImpact(byType);
  return {
    month,
    pickupCount: rows.length,
    totalKg: impact.totalKg,
    totalValue,
    promoBonus: bonus,
    co2Kg: impact.co2Kg,
    treesEquivalent: impact.treesEquivalent,
    breakdown: impact.breakdown,
    destinations: Object.entries(byDestination)
      .map(([name, kg]) => ({ name, kg: round1(kg) }))
      .sort((a, b) => b.kg - a.kg),
    pickups: rows,
  };
}

// GET /api/business/report?month=YYYY-MM  (business user)
exports.getReport = asyncHandler(async (req, res) => {
  const user = await requireBusiness(req.user.id);
  const report = await buildReport(user._id, monthParam(req));
  res.json({ businessName: user.businessProfile.businessName, gstin: user.businessProfile.gstin || null, ...report });
});

// GET /api/business/report/csv?month=YYYY-MM
exports.getReportCsv = asyncHandler(async (req, res) => {
  const user = await requireBusiness(req.user.id);
  const month = monthParam(req);
  const report = await buildReport(user._id, month);

  const csv = toCsv(
    report.pickups.map((r) => ({ ...r, date: new Date(r.date).toISOString().slice(0, 10) })),
    [
      { key: "date", label: "Date" },
      { key: "site", label: "Site" },
      { key: "materials", label: "Materials" },
      { key: "kg", label: "Weight (kg)" },
      { key: "value", label: "Value (INR)" },
      { key: "destination", label: "Delivered to" },
    ]
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="scrapconnect-report-${month}.csv"`);
  res.send(csv);
});