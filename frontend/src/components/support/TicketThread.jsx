import { useState } from "react";
import ErrorBox from "../common/ErrorBox";
import { STATUS_LABEL } from "../../utils/supportLabels";

const STATUS_STYLE = {
  open: "bg-amber/15 text-amber-dark",
  in_progress: "bg-rust/10 text-rust",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-inkSoft/10 text-inkSoft",
};

export function StatusPill({ status }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] || STATUS_STYLE.closed}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

const fmt = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Shared conversation view: used by the requester (Help page) and the admin
// (Support tab). `viewerSide` decides which messages appear as "mine".
export default function TicketThread({ ticket, viewerSide, onReply, canReply = true }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onReply(text.trim());
      setText("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="space-y-2 mb-4">
        {ticket.messages.map((m, i) => {
          const mine = m.sender === viewerSide;
          return (
            <div key={m._id || i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  mine ? "bg-rust/10 text-ink" : "bg-surface border border-line text-ink"
                }`}
              >
                <p className="text-[11px] font-semibold text-inkSoft mb-0.5">
                  {m.sender === "admin" ? "ScrapConnect support" : m.senderName || "User"} · {fmt(m.at)}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {canReply ? (
        <form onSubmit={submit} className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Write a reply…"
            className="input flex-1 resize-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50">
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-inkFaint">This request is closed. Open a new one if you still need help.</p>
      )}
    </div>
  );
}