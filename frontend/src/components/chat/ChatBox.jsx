import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import usePickupChat from "../../hooks/usePickupChat";
import useGeolocation from "../../hooks/useGeolocation";
import { useAuth } from "../../context/AuthContext";
import { encodeLocationMessage, parseLocationMessage } from "../../utils/chatLocation";

// Short, one-tap phrases for the most common pickup-coordination moments —
// saves typing the same handful of things every time. Worded differently
// per side of the conversation: a collector is the one traveling, so their
// phrases are about status-on-the-move; a requester is the one waiting, so
// theirs are about being ready/reachable instead.
const QUICK_REPLIES_COLLECTOR = ["On my way", "5 mins away", "Arrived", "Running late"];
const QUICK_REPLIES_REQUESTER = ["I'm ready", "Come to the gate", "One moment please", "Not home yet — call me"];

// Three dots that pulse in sequence — used for both "loading conversation"
// and (later) a typing-style indicator, so it's one shared beat instead of
// static text in one place and a spinner somewhere else.
function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1 py-8">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-inkFaint"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function ChatBox({ pickupId, open, onClose, otherPartyName }) {
  const { user } = useAuth();
  const { messages, loading, error, sending, send } = usePickupChat(pickupId, open);
  const { coords, status: locStatus, error: locError, locate } = useGeolocation();
  const quickReplies = user?.role === "collector" ? QUICK_REPLIES_COLLECTOR : QUICK_REPLIES_REQUESTER;
  const [text, setText] = useState(""); 
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fire once a coordinate actually resolves, so "Share location" is a
  // single tap rather than "tap, wait, tap again" — the button itself
  // just calls locate(); the message goes out as soon as it settles.
  useEffect(() => {
    if (locStatus === "success" && coords) {
      send(encodeLocationMessage(coords.lat, coords.lng));
    }
    // Only the moment status flips to "success" matters here — coords
    // itself is read, not depended on, so this doesn't refire on every
    // coords object identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locStatus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    send(text);
    setText("");
  };

  const handleQuickReply = (phrase) => {
    if (sending) return;
    send(phrase);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="ticket w-full sm:max-w-md h-[80dvh] sm:h-[560px] flex flex-col overflow-hidden rounded-b-none sm:rounded-b-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised">
              <div>
                <div className="font-display font-semibold text-ink text-sm">
                  {otherPartyName ? `Chat with ${otherPartyName}` : "Pickup chat"}
                </div>
                <div className="text-xs text-inkFaint font-mono">#{pickupId?.slice(-6).toUpperCase()}</div>
              </div>
              <motion.button
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-inkFaint hover:text-rust hover:bg-rust/[0.06]"
                aria-label="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loading ? (
                <LoadingDots />
              ) : messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-inkFaint py-8"
                >
                  No messages yet — say hello to coordinate the pickup.
                </motion.div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender?._id === user?._id || m.sender?._id === user?.id;
                  const location = parseLocationMessage(m.text);
                  return (
                    <motion.div
                      key={m._id}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        {!mine && (
                          <span className="text-[11px] text-inkFaint font-mono px-1">{m.sender?.name}</span>
                        )}
                        {location ? (
                          <a
                            href={location.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-ticket text-sm leading-snug border transition-opacity hover:opacity-90 ${
                              mine
                                ? "bg-rust text-surface border-rust rounded-br-sm"
                                : "bg-surfaceRaised border-line text-ink rounded-bl-sm"
                            }`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>
                              <span className="font-semibold">Live location shared</span>
                              <span className={`block text-[11px] ${mine ? "text-surface/80" : "text-inkFaint"}`}>
                                Tap to open in Maps
                              </span>
                            </span>
                          </a>
                        ) : (
                          <div
                            className={`px-3.5 py-2 rounded-ticket text-sm leading-snug ${
                              mine
                                ? "bg-rust text-surface rounded-br-sm"
                                : "bg-surfaceRaised border border-line text-ink rounded-bl-sm"
                            }`}
                          >
                            {m.text}
                          </div>
                        )}
                        <span className="text-[10px] text-inkFaint font-mono px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 text-xs text-danger bg-danger/[0.07] border-t border-danger/20 overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick actions — one tap instead of typing the same handful of
                coordination phrases every pickup, plus live location. */}
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 overflow-x-auto border-t border-line bg-surfaceRaised">
              {quickReplies.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleQuickReply(phrase)}
                  disabled={sending}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-inkSoft border border-line
                             hover:border-rust/50 hover:text-rust transition-colors disabled:opacity-50"
                >
                  {phrase}
                </button>
              ))}
              <button
                type="button"
                onClick={locate}
                disabled={locStatus === "locating"}
                title="Share your current location"
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50
                           border-line text-inkSoft hover:border-rust/50 hover:text-rust"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {locStatus === "locating" ? "Locating…" : "Share new live location"}
              </button>
            </div>

            {locStatus === "error" && (
              <p className="px-4 pb-1.5 -mt-1 text-[11px] text-danger bg-surfaceRaised">{locError}</p>
            )}

            {/* Composer */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 pb-3 pt-1.5 bg-surfaceRaised">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                maxLength={1000}
                className="field-input flex-1"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="submit"
                disabled={!text.trim() || sending}
                className="btn-primary !px-4 !py-2.5"
              >
                <motion.svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  animate={sending ? { x: [0, 14, 0], opacity: [1, 0, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </motion.svg>
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}