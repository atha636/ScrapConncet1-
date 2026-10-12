import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import ErrorBox from "../components/common/ErrorBox";
import useDocumentMeta from "../hooks/useDocumentMeta";
import useGeolocation from "../hooks/useGeolocation";
import { formatPrice } from "../utils/formatPrice";
import { SCRAP_TYPE_LABELS } from "../utils/pickupItems";
import {
  getBusinessProfile,
  saveBusinessProfile,
  getBusinessReport,
  downloadBusinessReportCsv,
} from "../services/businessService";

const TYPES = { shop: "Shop / retail", office: "Office", school: "School / college", factory: "Factory / workshop", society: "Housing society", other: "Other" };
const inputCls = "mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/* ------------------------------- profile -------------------------------- */

function ProfileForm({ profile, onSaved, onCancel }) {
  const [businessName, setBusinessName] = useState(profile?.businessName || "");
  const [businessType, setBusinessType] = useState(profile?.businessType || "shop");
  const [gstin, setGstin] = useState(profile?.gstin || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await saveBusinessProfile({ businessName: businessName.trim(), businessType, gstin: gstin.trim() });
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || err.response?.data?.message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs text-inkSoft">
          Business name
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required maxLength={80} className={inputCls} />
        </label>
        <label className="block text-xs text-inkSoft">
          Type
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={inputCls}>
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-inkSoft">
          GSTIN (optional)
          <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} maxLength={15} className={inputCls} />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? "Saving…" : profile?.enabled ? "Save changes" : "Create business account"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

/* --------------------------------- sites -------------------------------- */

function Sites({ profile, onSaved }) {
  const navigate = useNavigate();
  const { coords, status, error: locError, locate } = useGeolocation();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const persist = async (sites) => {
    setSaving(true);
    setError("");
    try {
      const res = await saveBusinessProfile({
        businessName: profile.businessName,
        businessType: profile.businessType,
        gstin: profile.gstin,
        sites: sites.map(({ label: l, address: a, lat, lng }) => ({ label: l, address: a, lat, lng })),
      });
      onSaved(res.data);
      return true;
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || err.response?.data?.message || "Couldn't save the site.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!coords) return setError("Tap “Use my current location” while you're at the site.");
    const ok = await persist([...profile.sites, { label: label.trim(), address: address.trim(), lat: coords.lat, lng: coords.lng }]);
    if (ok) {
      setLabel("");
      setAddress("");
    }
  };

  return (
    <div>
      <h3 className="font-display font-bold text-ink mb-2">Pickup sites</h3>
      <p className="text-xs text-inkSoft mb-3">Save each branch or floor once, then request a pickup for it in one tap.</p>
      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      <div className="space-y-2 mb-4">
        {profile.sites.length === 0 && <p className="text-sm text-inkSoft">No sites yet.</p>}
        {profile.sites.map((s) => (
          <Card key={s.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{s.label}</p>
              <p className="text-xs text-inkSoft truncate">{s.address}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => navigate("/request", { state: { site: s } })}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rust text-white"
              >
                Request pickup
              </button>
              <button
                onClick={() => persist(profile.sites.filter((x) => x.id !== s.id))}
                disabled={saving}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-inkSoft"
              >
                Remove
              </button>
            </div>
          </Card>
        ))}
      </div>

      {profile.sites.length < 10 && (
        <Card className="p-4">
          <form onSubmit={add} className="space-y-3">
            <label className="block text-xs text-inkSoft">
              Site name
              <input value={label} onChange={(e) => setLabel(e.target.value)} required minLength={2} maxLength={60} placeholder="e.g. Main branch" className={inputCls} />
            </label>
            <label className="block text-xs text-inkSoft">
              Address
              <input value={address} onChange={(e) => setAddress(e.target.value)} required minLength={5} maxLength={200} className={inputCls} />
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={locate} className="btn-secondary text-sm">
                {status === "loading" ? "Locating…" : coords ? "Location captured ✓" : "Use my current location"}
              </button>
              {locError && <span className="text-xs text-rust">{locError}</span>}
            </div>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Add site"}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------- report -------------------------------- */

function Stat({ label, value }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] uppercase tracking-wide text-inkFaint">{label}</p>
      <p className="font-display text-xl font-bold text-ink">{value}</p>
    </Card>
  );
}

function Report() {
  const [month, setMonth] = useState(thisMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getBusinessReport(month)
      .then((res) => {
        if (!cancelled) {
          setReport(res.data);
          setError("");
        }
      })
      .catch(() => !cancelled && setError("Couldn't load this report."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const download = async () => {
    try {
      const res = await downloadBusinessReportCsv(month);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scrapconnect-report-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't download the CSV.");
    }
  };

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
        <label className="text-xs text-inkSoft">
          Month
          <input
            type="month"
            value={month}
            max={thisMonth()}
            onChange={(e) => {
              if (!e.target.value) return;
              setLoading(true);
              setMonth(e.target.value);
            }}
            className={`${inputCls} block`}
          />
        </label>
        <button onClick={download} className="btn-secondary text-sm">Download CSV</button>
        <button onClick={() => window.print()} className="btn-secondary text-sm">Print / save as PDF</button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {loading || !report ? (
        <Loader />
      ) : (
        <div>
          <div className="hidden print:block mb-4">
            <h2 className="font-display text-xl font-bold">{report.businessName}</h2>
            <p className="text-sm">
              Recycling report — {monthLabel}
              {report.gstin ? ` · GSTIN ${report.gstin}` : ""}
            </p>
          </div>

          {report.pickupCount === 0 ? (
            <p className="text-sm text-inkSoft">No completed pickups in {monthLabel}.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Stat label="Pickups" value={report.pickupCount} />
                <Stat label="Recycled" value={`${report.totalKg} kg`} />
                <Stat label="Value" value={formatPrice(report.totalValue)} />
                <Stat label="CO₂ saved (est.)" value={`${report.co2Kg} kg`} />
              </div>
              <p className="text-xs text-inkSoft mb-4">
                ≈ {report.treesEquivalent} trees absorbing CO₂ for a year. CO₂ figures are rough estimates.
                {report.promoBonus > 0 ? ` Includes ${formatPrice(report.promoBonus)} in promo bonuses.` : ""}
              </p>

              <h3 className="font-display font-bold text-ink mb-2">By material</h3>
              <div className="space-y-1 mb-5">
                {report.breakdown.map((b) => (
                  <div key={b.scrapType} className="flex justify-between text-sm">
                    <span className="text-ink">{SCRAP_TYPE_LABELS[b.scrapType] || b.scrapType}</span>
                    <span className="text-inkSoft">{b.kg} kg · {b.co2Kg} kg CO₂</span>
                  </div>
                ))}
              </div>

              {report.destinations.length > 0 && (
                <>
                  <h3 className="font-display font-bold text-ink mb-2">Where it went</h3>
                  <div className="space-y-1 mb-5">
                    {report.destinations.map((d) => (
                      <div key={d.name} className="flex justify-between text-sm">
                        <span className="text-ink">{d.name}</span>
                        <span className="text-inkSoft">{d.kg} kg</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h3 className="font-display font-bold text-ink mb-2">Pickups</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-inkFaint border-b border-line">
                      <th className="py-1.5 pr-3">Date</th>
                      <th className="pr-3">Site</th>
                      <th className="pr-3">Materials</th>
                      <th className="pr-3 text-right">Kg</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pickups.map((p) => (
                      <tr key={p.pickupId} className="border-b border-line/60">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="pr-3 max-w-[200px] truncate">{p.site}</td>
                        <td className="pr-3">{p.materials}</td>
                        <td className="pr-3 text-right">{p.kg}</td>
                        <td className="text-right">
                          <Link to={`/receipt/${p.pickupId}`} className="text-rust print:no-underline">{formatPrice(p.value)}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function Business() {
  useDocumentMeta({ title: "Business account", noindex: true });
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("report");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getBusinessProfile()
      .then((res) => setProfile(res.data))
      .catch(() => setError("Couldn't load your business account."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!profile) return <Loader />;

  if (!profile.enabled) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Business account</h1>
        <p className="text-sm text-inkSoft mb-5">
          For shops, offices, schools and societies with regular or large amounts of scrap. Save your sites, request pickups in one tap, and get a monthly recycling report with CO₂ impact.
        </p>
        <ProfileForm profile={profile} onSaved={setProfile} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{profile.businessName}</h1>
          <p className="text-xs text-inkSoft">{TYPES[profile.businessType]}{profile.gstin ? ` · GSTIN ${profile.gstin}` : ""}</p>
        </div>
        <button onClick={() => setEditing((v) => !v)} className="text-xs font-semibold text-rust">
          {editing ? "Close" : "Edit details"}
        </button>
      </div>

      {editing && (
        <div className="mb-5 print:hidden">
          <ProfileForm
            profile={profile}
            onSaved={(p) => {
              setProfile(p);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      <div className="flex gap-2 mb-5 print:hidden">
        {[["report", "Monthly report"], ["sites", "Pickup sites"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${tab === k ? "bg-rust text-white border-rust" : "border-line text-inkSoft"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "report" ? <Report /> : <Sites profile={profile} onSaved={setProfile} />}
    </div>
  );
}