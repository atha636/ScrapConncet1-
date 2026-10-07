import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { getAuditLogs } from "../../services/auditService";

const PAGE_SIZE = 20;

// Turns an entry's `details` into a short readable line. Unknown shapes fall
// back to nothing rather than dumping raw JSON on the screen.
function describe(entry) {
  const d = entry.details || {};
  switch (entry.action) {
    case "rate.update":
      return `₹${d.from}/kg → ₹${d.to}/kg`;
    case "verification.reject":
    case "verification.revoke":
      return d.reason ? `Reason: ${d.reason}` : "";
    case "verification.approve":
      return d.expiresAt ? `Valid until ${new Date(d.expiresAt).toLocaleDateString()}` : "";
    case "collector.create":
      return d.email ? `${d.email}` : "";
    case "payout.approve":
      return d.amount != null ? `₹${d.amount}` : "";
    case "payout.reject":
      return [d.amount != null ? `₹${d.amount}` : "", d.note ? `Note: ${d.note}` : ""].filter(Boolean).join(" · ");
    case "dispute.resolve":
      return d.outcome ? `Outcome: ${d.outcome}` : "";
    default:
      return "";
  }
}

const fmtTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AuditLogTab() {
  const [entries, setEntries] = useState([]);
  const [actions, setActions] = useState([]);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAuditLogs({
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setEntries(res.data.data);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total);
      setActions(res.data.actions || []);
    } catch {
      setError("Couldn't load the audit log.");
    } finally {
      setLoading(false);
    }
  }, [action, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const actionLabel = (value) => actions.find((a) => a.value === value)?.label || value;
  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const inputCls = "border border-line rounded-md px-3 py-1.5 text-sm bg-surface text-ink";

  return (
    <div>
      <p className="text-sm text-inkSoft mb-4">
        A record of admin actions and automatic system changes: who did what, to whom, and when.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs text-inkSoft">
          Action
          <select value={action} onChange={changeFilter(setAction)} className={`${inputCls} block mt-1`}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-inkSoft">
          From
          <input type="date" value={from} onChange={changeFilter(setFrom)} className={`${inputCls} block mt-1`} />
        </label>
        <label className="text-xs text-inkSoft">
          To
          <input type="date" value={to} onChange={changeFilter(setTo)} className={`${inputCls} block mt-1`} />
        </label>
        {(action || from || to) && (
          <button
            onClick={() => {
              setAction("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
            className="text-sm text-rust underline pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : entries.length === 0 ? (
        <p className="text-sm text-inkSoft py-8 text-center">No activity recorded for these filters.</p>
      ) : (
        <>
          <Card className="divide-y divide-line">
            {entries.map((e) => (
              <div key={e._id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-medium text-ink">
                    {actionLabel(e.action)}
                    {e.targetLabel && <span className="text-inkSoft font-normal"> · {e.targetLabel}</span>}
                  </div>
                  <div className="text-xs text-inkFaint font-mono">{fmtTime(e.createdAt)}</div>
                </div>
                {describe(e) && <div className="text-xs text-inkSoft mt-0.5">{describe(e)}</div>}
                <div className="text-xs text-inkFaint mt-0.5">
                  by {e.actorName}
                  {e.actorEmail ? ` (${e.actorEmail})` : ""}
                </div>
              </div>
            ))}
          </Card>

          <div className="flex items-center justify-between mt-4 text-sm text-inkSoft">
            <span>
              {total} entr{total === 1 ? "y" : "ies"} · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-md border border-line disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-md border border-line disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}