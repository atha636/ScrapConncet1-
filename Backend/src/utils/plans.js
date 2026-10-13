const PlatformSettings = require("../models/PlatformSettings");

const PLAN_DAYS = 30;

// What a fresh install uses until an admin edits them.
const DEFAULT_PLANS = [
  { key: "free", name: "Free", priceMonthly: 0, commissionPct: 10 },
  { key: "pro", name: "Pro", priceMonthly: 499, commissionPct: 6 },
  { key: "elite", name: "Elite", priceMonthly: 999, commissionPct: 3 },
];

// Settings with defaults filled in for any plan not yet saved.
async function getSettings() {
  const doc = await PlatformSettings.findOne({ key: "main" });
  const saved = Object.fromEntries((doc?.plans || []).map((p) => [p.key, p]));
  return {
    commissionEnabled: !!doc?.commissionEnabled,
    plans: DEFAULT_PLANS.map((d) => {
      const s = saved[d.key];
      return s
        ? { key: d.key, name: s.name || d.name, priceMonthly: s.priceMonthly, commissionPct: s.commissionPct }
        : { ...d };
    }),
  };
}

// A plan only counts while it hasn't expired; otherwise the collector is on Free.
function effectivePlanKey(user, now = new Date()) {
  const sub = user?.subscription;
  if (sub?.planKey && sub.expiresAt && new Date(sub.expiresAt) > now) return sub.planKey;
  return "free";
}

// Fee in whole rupees on a price, 0 when commission is switched off.
function commissionFor(settings, planKey, price) {
  if (!settings.commissionEnabled || !(price > 0)) return 0;
  const plan = settings.plans.find((p) => p.key === planKey) || settings.plans[0];
  return Math.min(price, Math.round((price * plan.commissionPct) / 100));
}

module.exports = { PLAN_DAYS, DEFAULT_PLANS, getSettings, effectivePlanKey, commissionFor };