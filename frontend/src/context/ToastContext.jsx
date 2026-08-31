import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext(null);

const TYPE_ACCENT = {
  info: "border-l-rust",
  success: "border-l-amber-dark",
  error: "border-l-danger",
};

const DEFAULT_DURATION_MS = 5000;

/**
 * Global toast system. Deliberately built as a small stack of "ticket
 * stubs" sliding in from the corner — same flat paper/ink language as the
 * rest of the app (.ticket class, ink-stamp borders), not a glassy/blurred
 * overlay. Mount <ToastViewport /> once near the root; call useToast()
 * anywhere to push one.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ title, message, type = "info", duration = DEFAULT_DURATION_MS, onClick }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => {
        // Cap the visible stack at 4 — a burst of live events (several new
        // pickups landing at once) shouldn't cover half the screen.
        const next = [...prev, { id, title, message, type, onClick }];
        return next.length > 4 ? next.slice(next.length - 4) : next;
      });
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div
      className="fixed z-[70] bottom-4 right-4 left-4 sm:left-auto sm:right-5 sm:bottom-5 flex flex-col gap-2 sm:w-80 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={() => {
              t.onClick?.();
              dismiss(t.id);
            }}
            className={`ticket pointer-events-auto pl-4 pr-3 py-3 flex items-start gap-3 border-l-[3px] ${TYPE_ACCENT[t.type] || TYPE_ACCENT.info} ${t.onClick ? "cursor-pointer" : ""}`}
          >
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-sm font-semibold text-ink truncate">{t.title}</p>}
              {t.message && <p className="text-xs text-inkSoft mt-0.5 leading-snug">{t.message}</p>}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
              className="shrink-0 text-inkFaint hover:text-ink transition-colors -mt-0.5 -mr-0.5 p-1"
              aria-label="Dismiss"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}