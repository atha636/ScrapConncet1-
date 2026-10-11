import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { listCoupons, createCoupon, updateCoupon } from "../../services/couponService";

const EMPTY = {
  code: "",
  description: "",
  type: "flat",
  value: "",
  maxBonus: "",
  minOrderValue: "",
  maxRedemptions: "",
  perUserLimit: "1",
  expiresAt: "",
  firstPickupOnly: false,
};
const inputCls = "mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";

const numOrNull = (v) => (v === "" ? null : Number(v));

// Admin: create promo codes and switch them on/off. The platform pays the
// bonus (it's credited to the collector's wallet on settlement).
export default function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setCoupons((await listCoupons()).data.coupons);
    } catch {
      setError("Couldn't load promo codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createCoupon({
        code: form.code,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value),
        maxBonus: form.type === "percent" ? numOrNull(form.maxBonus) : null,
        minOrderValue: form.minOrderValue === "" ? 0 : Number(form.minOrderValue),
        maxRedemptions: numOrNull(form.maxRedemptions),
        perUserLimit: Number(form.perUserLimit) || 1,
        expiresAt: form.expiresAt ? new Date(form.expiresAt + "T23:59:59").toISOString() : null,
        firstPickupOnly: form.firstPickupOnly,
      });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || err.response?.data?.message || "Couldn't create the code.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    try {
      await updateCoupon(c._id, { active: !c.active });
      await load();
    } catch {
      setError("Couldn't update that code.");
    }
  };

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      <Card className="p-4 self-start">
        <h3 className="font-display font-bold text-ink mb-3">New promo code</h3>
        {error && (
          <div className="mb-3">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs text-inkSoft">
            Code
            <input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} required maxLength={20} placeholder="WELCOME50" className={inputCls} />
          </label>
          <label className="block text-xs text-inkSoft">
            Description (shown to users)
            <input value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={140} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-inkSoft">
              Type
              <select value={form.type} onChange={(e) => set({ type: e.target.value })} className={inputCls}>
                <option value="flat">Flat ₹</option>
                <option value="percent">Percent %</option>
              </select>
            </label>
            <label className="block text-xs text-inkSoft">
              Value
              <input type="number" min="1" max={form.type === "percent" ? 100 : undefined} value={form.value} onChange={(e) => set({ value: e.target.value })} required className={inputCls} />
            </label>
          </div>
          {form.type === "percent" && (
            <label className="block text-xs text-inkSoft">
              Max bonus ₹ (optional cap)
              <input type="number" min="1" value={form.maxBonus} onChange={(e) => set({ maxBonus: e.target.value })} className={inputCls} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-inkSoft">
              Min final price ₹
              <input type="number" min="0" value={form.minOrderValue} onChange={(e) => set({ minOrderValue: e.target.value })} className={inputCls} />
            </label>
            <label className="block text-xs text-inkSoft">
              Uses per person
              <input type="number" min="1" value={form.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-inkSoft">
              Total uses (blank = no limit)
              <input type="number" min="1" value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} className={inputCls} />
            </label>
            <label className="block text-xs text-inkSoft">
              Expires on
              <input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} className={inputCls} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.firstPickupOnly} onChange={(e) => set({ firstPickupOnly: e.target.checked })} />
            First pickup only
          </label>
          <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Create code"}
          </button>
        </form>
      </Card>

      <div className="space-y-2">
        {loading ? (
          <Loader />
        ) : coupons.length === 0 ? (
          <p className="text-sm text-inkSoft">No promo codes yet.</p>
        ) : (
          coupons.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            return (
              <Card key={c._id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-ink">{c.code}</span>
                    <span className="text-sm text-inkSoft"> · {c.summary}</span>
                  </div>
                  <button onClick={() => toggle(c)} className={`text-xs font-semibold px-3 py-1 rounded-full border ${c.active ? "border-line text-inkSoft" : "bg-rust text-white border-rust"}`}>
                    {c.active ? "Turn off" : "Turn on"}
                  </button>
                </div>
                <p className="text-xs text-inkSoft mt-1">
                  {c.active ? (expired ? "Expired" : "Active") : "Off"} · used {c.used}
                  {c.maxRedemptions ? `/${c.maxRedemptions}` : ""} · bonus paid ₹{c.bonusPaid}
                  {c.minOrderValue ? ` · min ₹${c.minOrderValue}` : ""}
                  {c.firstPickupOnly ? " · first pickup only" : ""}
                  {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                </p>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}