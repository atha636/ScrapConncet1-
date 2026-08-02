import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import useNotifications from "../../hooks/useNotifications";
import { useAuth } from "../../context/AuthContext";
import ChatBox from "../chat/ChatBox";

// Each notification type gets its own colored badge so the list is scannable
// at a glance, not just a wall of identical rust-colored icons.
const TYPE_STYLE = {
  pickup_accepted: {
    bg: "bg-amber/15",
    fg: "text-amber-dark",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  status_update: {
    bg: "bg-rust/10",
    fg: "text-rust",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  new_message: {
    bg: "bg-inkSoft/10",
    fg: "text-inkSoft",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
};

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const listItem = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.18 } },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chatPickup, setChatPickup] = useState(null);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // A "new_message" notification opens the chat right where you are —
  // no page navigation needed, since the pickup now comes populated with
  // enough (scrapType, user, collector) to render ChatBox directly. Any
  // other notification type still navigates to the relevant dashboard, and
  // this falls back to that too if the pickup was deleted (pickup is null).
  const handleClick = (n) => {
    if (!n.read) markRead(n._id);
    setOpen(false);

    if (n.type === "new_message" && n.pickup) {
      setChatPickup(n.pickup);
      return;
    }

    if (n.pickup) navigate(user?.role === "collector" ? "/collector" : "/my-requests");
  };

  const otherPartyName =
    chatPickup && (user?.role === "collector" ? chatPickup.user?.name : chatPickup.collector?.name);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-md flex items-center justify-center text-inkSoft hover:text-rust hover:bg-rust/[0.06] transition-colors"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rust text-surface text-[10px] font-bold font-mono flex items-center justify-center ring-2 ring-surface"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop on mobile so the panel reads as a modal, not a stray box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 sm:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ transformOrigin: "top right" }}
              className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-surfaceRaised
                         border border-line rounded-lg shadow-[0_8px_24px_rgba(36,26,18,0.14)]
                         overflow-hidden z-50"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <span className="font-display font-semibold text-sm text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={markAllRead} className="text-xs font-semibold text-rust hover:underline">
                    Mark all read
                  </motion.button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center text-sm text-inkFaint py-10">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="text-center text-sm text-inkFaint py-10">You're all caught up.</div>
                ) : (
                  <motion.div variants={listStagger} initial="hidden" animate="show">
                    {items.map((n) => {
                      const style = TYPE_STYLE[n.type] || TYPE_STYLE.status_update;
                      return (
                        <motion.button
                          key={n._id}
                          variants={listItem}
                          onClick={() => handleClick(n)}
                          className={`w-full text-left flex gap-3 px-4 py-3 border-b border-line last:border-0 transition-colors hover:bg-rust/[0.05] ${
                            n.read ? "bg-transparent" : "bg-rust/[0.03]"
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.fg}`}>
                            {style.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm leading-snug ${n.read ? "text-inkSoft" : "text-ink font-medium"}`}>
                              {n.text}
                            </div>
                            <div className="text-[11px] text-inkFaint font-mono mt-1">{timeAgo(n.createdAt)}</div>
                          </div>
                          {!n.read && (
                            <motion.span
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                              className="w-2 h-2 rounded-full bg-rust shrink-0 mt-1.5"
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChatBox
        pickupId={chatPickup?._id}
        open={!!chatPickup}
        onClose={() => setChatPickup(null)}
        otherPartyName={otherPartyName}
      />
    </div>
  );
}