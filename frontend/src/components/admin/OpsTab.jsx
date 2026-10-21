import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { adminGetOps } from "../../services/opsService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";
import { formatPrice } from "../../utils/formatPrice";

const POLL_MS = 20000;

const SEVERITY = {
  critical: { dot: "bg-danger animate-pulse", badge: "bg-danger text-surface", ring: "border-danger/50" },
  high: { dot: "bg-danger", badge: "bg-danger/10 text-danger", ring: "border-danger/30" },
  medium: { dot: "bg-amber", badge: "bg-amber/20 text-amber-dark", ring: "border-line" },
  low: { dot: "bg-inkFaint", badge: "bg-line/60 text-inkSoft", ring: "border-line" },
};

const duration = (mins) => {
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
};

function Tile({ label, value, sub, tone }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] text-inkFaint uppercase tracking-wide font-mono mb-1">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone || "text-ink"}`}>{value}</div>
      {sub && <div className="text-xs text-inkFaint mt-0.5">{sub}</div>}
    </Card>
  );
}

/**
 * Admin ops centre: today's activity, what's live, and a ranked list of
 * things that need attention — each with a button to the tab where it's
 * handled. Read-only; refreshes itself while the page is visible.
 */
export default function OpsTab({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminGetOps()
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch(() => setError("Couldn't load the ops centre."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return <Loader />;

  const attention = data?.attention || [];
  const stuck = (data?.live.stalled || 0) + (data?.live.urgent || 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-xs text-inkFaint">
          {data ? `Updated ${new Date(data.generatedAt).toLocaleTimeString("en-IN")} · refreshes every 20 seconds` : ""}
        </p>
        <button type="button" onClick={load} className="text-xs font-semibold text-inkSoft hover:text-rust shrink-0">
          Refresh now
        </button>
      </div>

      {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Tile label="Requests today" value={data.today.requests} />
            <Tile label="Completed today" value={data.today.completed} />
            <Tile label="Cancelled today" value={data.today.cancelled} />
            <Tile
              label="Waiting for a collector"
              value={data.live.pending}
              sub={data.live.oldestPendingMinutes != null ? `Oldest: ${duration(data.live.oldestPendingMinutes)}` : "None waiting"}
              tone={data.live.urgent > 0 ? "text-danger" : undefined}
            />
            <Tile label="In progress" value={data.live.active} />
            <Tile label="Stuck or urgent" value={stuck} tone={stuck > 0 ? "text-danger" : undefined} />
          </div>

          <h2 className="font-display font-semibold text-ink mb-3">Needs attention</h2>
          {attention.length === 0 ? (
            <Card className="p-8 text-center text-inkSoft mb-6">Nothing needs attention right now. All clear.</Card>
          ) : (
            <div className="space-y-2.5 mb-6">
              {attention.map((a) => {
                const s = SEVERITY[a.severity] || SEVERITY.low;
                return (
                  <Card key={a.key} className={`p-4 flex items-center gap-3 ${s.ring}`}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{a.label}</p>
                      <p className="text-xs text-inkSoft">{a.hint}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${s.badge}`}>{a.count}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate?.(a.tab)}
                      className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                    >
                      Open
                    </button>
                  </Card>
                );
              })}
            </div>
          )}

          {data.waiting.length > 0 && (
            <>
              <h2 className="font-display font-semibold text-ink mb-3">Waiting longest for a collector</h2>
              <Card className="divide-y divide-line">
                {data.waiting.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {SCRAP_TYPE_LABELS[p.scrapType] || p.scrapType}
                      {p.requester && <span className="text-inkFaint"> · {p.requester}</span>}
                      {p.urgent && <span className="ml-2 text-xs font-semibold text-danger">Urgent</span>}
                    </span>
                    <span className="shrink-0 text-inkSoft">
                      <span className="font-mono">{formatPrice(p.price)}</span> · {duration(p.waitingMinutes)}
                    </span>
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}