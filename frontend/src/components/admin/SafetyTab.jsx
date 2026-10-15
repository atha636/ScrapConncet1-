import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { adminListSafetyAlerts, adminResolveSafetyAlert } from "../../services/safetyService";

const POLL_MS = 15000;

function PersonRow({ label, p }) {
  if (!p) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-inkFaint">{label}</span>
      <span className="text-ink text-right">
        {p.name}
        {p.phone && (
          <a href={`tel:${p.phone}`} className="ml-2 font-mono text-rust hover:underline">{p.phone}</a>
        )}
      </span>
    </div>
  );
}

function AlertCard({ alert, onResolved }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = alert.status === "active";
  const mapLoc = alert.location || alert.pickup?.location;

  const resolve = async () => {
    setBusy(true);
    setError("");
    try {
      await adminResolveSafetyAlert(alert.id, note.trim() || undefined);
      onResolved();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't resolve this alert.");
      setBusy(false);
    }
  };

  return (
    <Card className={`p-4 ${active ? "border-danger/50" : ""}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {active && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-60" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-danger" />
            </span>
          )}
          SOS from {alert.triggeredRole === "collector" ? "collector" : "requester"} · {alert.triggeredBy?.name || "Unknown"}
        </span>
        <span className="text-xs text-inkFaint shrink-0">
          {new Date(alert.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      {alert.note && <p className="text-sm text-ink bg-danger/[0.06] border border-danger/20 rounded-md px-3 py-2 mb-3">“{alert.note}”</p>}

      <div className="space-y-1.5 mb-3">
        <PersonRow label="Raised by" p={alert.triggeredBy} />
        <PersonRow label="Requester" p={alert.pickup?.requester} />
        <PersonRow label="Collector" p={alert.pickup?.collector} />
        {alert.pickup && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-inkFaint">Pickup</span>
            <span className="text-ink capitalize">{alert.pickup.scrapType} · {alert.pickup.status.replace("_", " ")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {mapLoc && (
          <a href={`https://www.google.com/maps?q=${mapLoc.lat},${mapLoc.lng}`} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !px-3 text-xs">
            {alert.location ? "Alert location" : "Pickup location"}
          </a>
        )}
        {alert.shareToken && (
          <a href={`/trip/${alert.shareToken}`} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !px-3 text-xs">
            Live trip view
          </a>
        )}
        <a href="tel:112" className="rounded-lg border border-danger/40 text-danger text-xs font-bold px-3 py-1.5">Call 112</a>
      </div>

      {active ? (
        <div>
          {error && <div className="mb-2"><ErrorBox>{error}</ErrorBox></div>}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Resolution note (optional)"
            className="field-input text-sm mb-2"
          />
          <button type="button" onClick={resolve} disabled={busy} className="btn-primary !py-2 text-sm disabled:opacity-50">
            {busy ? "Resolving…" : "Mark resolved"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-inkSoft">
          Resolved{alert.resolvedByName ? ` by ${alert.resolvedByName}` : ""}
          {alert.resolutionNote ? ` — ${alert.resolutionNote}` : ""}
        </p>
      )}
    </Card>
  );
}

export default function SafetyTab({ onCountChange }) {
  const [status, setStatus] = useState("active");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminListSafetyAlerts(status)
      .then((res) => {
        setAlerts(res.data.alerts);
        onCountChange?.(res.data.activeCount);
        setError("");
      })
      .catch(() => setError("Couldn't load safety alerts."))
      .finally(() => setLoading(false));
  }, [status, onCountChange]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["active", "resolved"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setLoading(true); setStatus(s); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${status === s ? "bg-rust text-surface border-rust" : "border-line text-inkSoft hover:text-ink"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}
      {loading ? (
        <Loader />
      ) : alerts.length === 0 ? (
        <Card className="p-10 text-center text-inkSoft">
          {status === "active" ? "No active SOS alerts. All clear." : "No resolved alerts yet."}
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => <AlertCard key={a.id} alert={a} onResolved={load} />)}
        </div>
      )}
    </div>
  );
}