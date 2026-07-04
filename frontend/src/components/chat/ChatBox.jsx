import { useEffect, useRef, useState } from "react";
import usePickupChat from "../../hooks/usePickupChat";
import { useAuth } from "../../context/AuthContext";

export default function ChatBox({ pickupId, open, onClose, otherPartyName }) {
  const { user } = useAuth();
  const { messages, loading, error, sending, send } = usePickupChat(pickupId, open);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    send(text);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 p-0 sm:p-4">
      <div className="ticket w-full sm:max-w-md h-[80vh] sm:h-[560px] flex flex-col overflow-hidden rounded-b-none sm:rounded-b-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised">
          <div>
            <div className="font-display font-semibold text-ink text-sm">
              {otherPartyName ? `Chat with ${otherPartyName}` : "Pickup chat"}
            </div>
            <div className="text-xs text-inkFaint font-mono">#{pickupId.slice(-6).toUpperCase()}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-inkFaint hover:text-rust hover:bg-rust/[0.06] transition-colors"
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="text-center text-sm text-inkFaint py-8">Loading conversation…</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-inkFaint py-8">
              No messages yet — say hello to coordinate the pickup.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender?._id === user?._id || m.sender?._id === user?.id;
              return (
                <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!mine && (
                      <span className="text-[11px] text-inkFaint font-mono px-1">{m.sender?.name}</span>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-ticket text-sm leading-snug ${
                        mine
                          ? "bg-rust text-surface rounded-br-sm"
                          : "bg-surfaceRaised border border-line text-ink rounded-bl-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-inkFaint font-mono px-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-4 py-2 text-xs text-danger bg-[#8C2F1B]/[0.07] border-t border-[#8C2F1B]/20">
            {error}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-line bg-surfaceRaised">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={1000}
            className="field-input flex-1"
          />
          <button type="submit" disabled={!text.trim() || sending} className="btn-primary !px-4 !py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}