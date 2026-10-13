import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { formatPrice } from "../../utils/formatPrice";
import { getPlansOverview, savePlanSettings, grantPlan } from "../../services/planService";

const inputCls = "mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";
const errMsg = (err, fb) => err.response?.data?.details?.[0]?.message || err.response?.data?.message || fb;

function Stat({ label, value, sub }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] uppercase tracking-wide text-inkFaint">{label}</p>
      <p className="font-display text-xl font-bold text-ink">{value}</p>
      {sub && <p className="text-[11px] text-inkSoft">{sub}</p>}
    </Card>
  );
}

// Admin: commission on/off, plan prices and rates, revenue so far, and
// activating a plan for a collector who paid outside the app.
export default function PlansTab() {
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [grant, setGrant] = useState({ email: "", planKey: "pro", amountPaid: "", reference: "" });
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getPlansOverview();
      setData(res.data);
      setEnabled(res.data.settings.commissionEnabled);
      setPlans(res.data.settings.plans);
    } catch {
      setError("Couldn't load plans and revenue.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setPlan = (key, patch) => setPlans((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await savePlanSettings({
        commissionEnabled: enabled,
        plans: plans.map((p) => ({
          key: p.key,
          name: p.name,
          priceMonthly: Number(p.priceMonthly) || 0,
          commissionPct: Number(p.commissionPct) || 0,
        })),
      });
      setSaved(true);
      load();
    } catch (err) {
      setError(errMsg(err, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  };

  const doGrant = async (e) => {
    e.preventDefault();
    setGranting(true);
    setGrantMsg("");
    setError("");
    try {
      await grantPlan({
        email: grant.email.trim(),
        planKey: grant.planKey,
        amountPaid: Number(grant.amountPaid) || 0,
        reference: grant.reference.trim() || undefined,
      });
      setGrantMsg("Plan activated.");
      setGrant({ email: "", planKey: "pro", amountPaid: "", reference: "" });
      load();
    } catch (err) {
      setError(errMsg(err, "Couldn't activate the plan."));
    } finally {
      setGranting(false);
    }
  };

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Loader />;
  const { revenue, subscribers } = data;
  const maxMonth = Math.max(1, ...revenue.months.map((m) => m.commission + m.subscriptions));

  return (
    <div className="space-y-6">
      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Commission earned" value={formatPrice(revenue.commissionTotal)} sub={`${revenue.commissionPickups} pickups`} />
        <Stat label="Plan sales" value={formatPrice(revenue.subscriptionTotal)} sub={`${revenue.subscriptionSales} purchases`} />
        <Stat label="Total revenue" value={formatPrice(revenue.commissionTotal + revenue.subscriptionTotal)} />
        <Stat label="Paid subscribers" value={subscribers.pro + subscribers.elite} sub={`${subscribers.pro} Pro · ${subscribers.elite} Elite`} />
      </div>

      <Card className="p-4">
        <h3 className="font-display font-bold text-ink mb-3">Last 6 months</h3>
        <div className="space-y-2">
          {revenue.months.map((m) => {
            const total = m.commission + m.subscriptions;
            return (
              <div key={m.month} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-inkSoft shrink-0">{m.month}</span>
                <div className="flex-1 h-3 rounded bg-line/50 overflow-hidden flex">
                  <div className="bg-rust" style={{ width: `${(m.commission / maxMonth) * 100}%` }} title={`Commission ${m.commission}`} />
                  <div className="bg-amber" style={{ width: `${(m.subscriptions / maxMonth) * 100}%` }} title={`Plans ${m.subscriptions}`} />
                </div>
                <span className="w-20 text-right text-ink">{formatPrice(total)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-inkFaint mt-2">
          <span className="inline-block w-2 h-2 bg-rust rounded-sm mr-1" />Commission
          <span className="inline-block w-2 h-2 bg-amber rounded-sm mx-1 ml-3" />Plan sales
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="font-display font-bold text-ink mb-1">Commission &amp; plans</h3>
        <p className="text-xs text-inkSoft mb-3">
          When commission is on, each completed pickup's price is split: the collector keeps the rest after the % for their plan. Existing wallet balances are never touched.
        </p>
        <form onSubmit={save} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Charge commission on completed pickups
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            {plans.map((p) => (
              <div key={p.key} className="rounded-ticket border border-line p-3 space-y-2">
                <label className="block text-xs text-inkSoft">
                  Name
                  <input value={p.name} onChange={(e) => setPlan(p.key, { name: e.target.value })} minLength={2} maxLength={30} required className={inputCls} />
                </label>
                <label className="block text-xs text-inkSoft">
                  Price ₹ / 30 days
                  <input type="number" min="0" value={p.priceMonthly} disabled={p.key === "free"} onChange={(e) => setPlan(p.key, { priceMonthly: e.target.value })} className={`${inputCls} disabled:opacity-50`} />
                </label>
                <label className="block text-xs text-inkSoft">
                  Commission %
                  <input type="number" min="0" max="30" step="0.5" value={p.commissionPct} onChange={(e) => setPlan(p.key, { commissionPct: e.target.value })} className={inputCls} />
                </label>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-xs text-inkSoft">Saved.</span>}
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="font-display font-bold text-ink mb-1">Activate a plan manually</h3>
        <p className="text-xs text-inkSoft mb-3">For a collector who paid you outside the app (UPI, cash). The amount counts as plan revenue.</p>
        <form onSubmit={doGrant} className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs text-inkSoft">
            Collector's email
            <input type="email" required value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} className={inputCls} />
          </label>
          <label className="block text-xs text-inkSoft">
            Plan
            <select value={grant.planKey} onChange={(e) => setGrant({ ...grant, planKey: e.target.value })} className={inputCls}>
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
            </select>
          </label>
          <label className="block text-xs text-inkSoft">
            Amount paid ₹
            <input type="number" min="0" required value={grant.amountPaid} onChange={(e) => setGrant({ ...grant, amountPaid: e.target.value })} className={inputCls} />
          </label>
          <label className="block text-xs text-inkSoft">
            Payment reference (optional)
            <input value={grant.reference} maxLength={80} onChange={(e) => setGrant({ ...grant, reference: e.target.value })} className={inputCls} />
          </label>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={granting} className="btn-primary text-sm disabled:opacity-50">
              {granting ? "Activating…" : "Activate for 30 days"}
            </button>
            {grantMsg && <span className="text-xs text-inkSoft">{grantMsg}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}