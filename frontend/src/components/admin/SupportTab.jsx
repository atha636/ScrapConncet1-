import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import TicketThread, { StatusPill } from "../support/TicketThread";
import { CATEGORY_LABEL, STATUS_LABEL } from "../../utils/supportLabels";
import { adminListTickets, adminGetTicket, adminReplyTicket, adminSetTicketStatus } from "../../services/supportService";

const FILTERS = ["", "open", "in_progress", "resolved", "closed"];

export default function SupportTab() {
  const [status, setStatus] = useState("open");
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    adminListTickets({ status: status || undefined, limit: 30 })
      .then((res) => {
        setTickets(res.data.tickets);
        setCounts(res.data.counts || {});
        setError("");
      })
      .catch(() => setError("Couldn't load support requests."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id) => {
    try {
      setSelected((await adminGetTicket(id)).data);
    } catch {
      setError("Couldn't open that request.");
    }
  };

  const reply = async (message) => {
    const res = await adminReplyTicket(selected.id, message);
    setSelected((s) => ({ ...s, ...res.data }));
    load();
  };

  const changeStatus = async (next) => {
    try {
      const res = await adminSetTicketStatus(selected.id, next);
      setSelected((s) => ({ ...s, ...res.data }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't change status.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f || "all"}
            onClick={() => {
              setLoading(true);
              setSelected(null);
              setStatus(f);
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              status === f ? "bg-rust text-white border-rust" : "border-line text-inkSoft"
            }`}
          >
            {f ? STATUS_LABEL[f] : "All"}
            {f && counts[f] ? ` (${counts[f]})` : ""}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {loading ? (
            <Loader />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-inkSoft">No requests here.</p>
          ) : (
            tickets.map((t) => (
              <button key={t.id} onClick={() => open(t.id)} className="block w-full text-left">
                <Card className={`p-3 ${selected?.id === t.id ? "ring-2 ring-rust/40" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-inkFaint">{t.ticketNo}</span>
                    <StatusPill status={t.status} />
                  </div>
                  <p className="text-sm font-semibold text-ink truncate">{t.subject}</p>
                  <p className="text-xs text-inkSoft">
                    {t.requester?.name || "Deleted user"} ({t.requester?.role || "—"}) · {CATEGORY_LABEL[t.category]}
                    {t.lastReplyBy === "requester" && t.status !== "closed" ? " · awaiting reply" : ""}
                  </p>
                </Card>
              </button>
            ))
          )}
        </div>

        {selected && (
          <Card className="p-4 self-start">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-display font-bold text-ink">{selected.subject}</h3>
              <StatusPill status={selected.status} />
            </div>
            <p className="text-xs text-inkSoft mb-3">
              {selected.ticketNo} · {selected.requester?.name} · {selected.requester?.email}
              {selected.requester?.phone ? ` · ${selected.requester.phone}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["in_progress", "resolved", "closed"]
                .filter((s) => s !== selected.status)
                .map((s) => (
                  <button key={s} onClick={() => changeStatus(s)} className="text-xs font-semibold px-3 py-1 rounded-full border border-line text-inkSoft hover:border-rust">
                    Mark {STATUS_LABEL[s].toLowerCase()}
                  </button>
                ))}
            </div>
            <TicketThread ticket={selected} viewerSide="admin" onReply={reply} canReply={selected.status !== "closed"} />
          </Card>
        )}
      </div>
    </div>
  );
}