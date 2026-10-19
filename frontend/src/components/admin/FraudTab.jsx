import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { adminGetFraudFlags, adminReviewFraudFlag } from "../../services/fraudService";

function Person({ label, p }) {
  if (!p) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-inkFaint shrink-0">{label}</span>
      <span className="text-ink text-right min-w-0">
        <span className="font-semibold">{p.name}</span>
        <span className="text-inkFaint capitalize"> · {p.role}</span>
        {p.suspended && <span className="ml-1.5 text-danger text-xs font-semibold">Suspended</span>}
        {!p.active && <span className="ml-1.5 text-danger text-xs font-semibold">Deactivated</span>}
        {p.phone && (
          <a href={`tel:${p.phone}`} className="ml-2 font-mono text-rust hover:underline">{p.phone}</a>
        )}
      </span>
    </div>
  );
}

function FlagCard({ flag, onReviewed }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const high = flag.severity === "high";

  const review = async () => {
    setBusy(true);
    setError("");
    try {
      await adminReviewFraudFlag({ key: flag.key, evidenceCount: flag.evidenceCount, ...(note.trim() ? { note: note.trim() } : {}) });
      onReviewed();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't mark this as reviewed.");
      setBusy(false);
    }
  };

  return (
    <Card className={`p-5 ${high ? "border-danger/40" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display font-semibold text-ink text-sm">{flag.title}</h3>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
            high ? "bg-danger/10 text-danger" : "bg-amber/20 text-amber-dark"
          }`}
        >
          {flag.severity}
        </span>
      </div>
      <p className="text-sm text-inkSoft mb-3">{flag.detail}</p>

      <div className="space-y-1.5 mb-3">
        <Person label="Account" p={flag.user} />
        <Person label="Linked account" p={flag.other} />
      </div>

      {error && <div className="mb-2"><ErrorBox>{error}</ErrorBox></div>}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Note (optional)"
          className="field-input text-sm flex-1 min-w-[180px]"
        />
        <button type="button" onClick={review} disabled={busy} className="btn-secondary !py-1.5 !px-3 text-sm disabled:opacity-50">
          {busy ? "Saving…" : "Mark reviewed"}
        </button>
      </div>
    </Card>
  );
}

/**
 * Admin: accounts worth a closer look, from plain rules over the last 60
 * days. Read-only — act on an account through the Users, Verification and
 * Disputes tabs. A reviewed flag stays hidden until its evidence grows.
 */
export default function FraudTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyHigh, setOnlyHigh] = useState(false);

  const load = useCallback(() => {
    adminGetFraudFlags()
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch(() => setError("Couldn't load the fraud watch."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flags = (data?.flags || []).filter((f) => !onlyHigh || f.severity === "high");

  return (
    <div>
      <p className="text-sm text-inkSoft mb-4">
        Accounts worth a closer look, from simple rules over the last {data?.windowDays || 60} days — a flag is a
        prompt to check, not proof. Nothing here suspends anyone automatically.
      </p>

      <div className="flex items-center gap-2 mb-4">
        {[[false, "All"], [true, `High only${data ? ` (${data.highCount})` : ""}`]].map(([val, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setOnlyHigh(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${onlyHigh === val ? "bg-rust text-surface border-rust" : "border-line text-inkSoft hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={() => { setLoading(true); load(); }} className="ml-auto text-xs font-semibold text-inkSoft hover:text-rust">
          Refresh
        </button>
      </div>

      {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}
      {loading ? (
        <Loader />
      ) : flags.length === 0 ? (
        <Card className="p-10 text-center text-inkSoft">Nothing suspicious right now.</Card>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => <FlagCard key={f.key} flag={f} onReviewed={load} />)}
        </div>
      )}
    </div>
  );
}