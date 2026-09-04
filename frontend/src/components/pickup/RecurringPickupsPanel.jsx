import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMyRecurring, toggleRecurring, deleteRecurring } from "../../services/pickupService";
import Card from "../ui/Card";

const TYPE_LABELS = {
  metal: "Metal",
  plastic: "Plastic",
  paper: "Paper",
  "e-waste": "E-waste",
  glass: "Glass",
  other: "Other",
};

const FREQUENCY_LABELS = { weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

/**
 * Shown at the top of My Requests, but only once the requester actually has
 * at least one recurring template — most people never opt into "repeat
 * this pickup," and an empty state here every visit would just be clutter
 * for the common case.
 */
export default function RecurringPickupsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    getMyRecurring()
      .then((res) => setItems(res.data))
      .catch(() => {}) // non-critical panel — a failed load just means it stays hidden, not a page-breaking error
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (item) => {
    setActingId(item._id);
    try {
      const res = await toggleRecurring(item._id);
      setItems((prev) => prev.map((x) => (x._id === item._id ? res.data : x)));
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Cancel your ${FREQUENCY_LABELS[item.frequency].toLowerCase()} ${item.scrapType} pickup?`)) return;
    setActingId(item._id);
    try {
      await deleteRecurring(item._id);
      setItems((prev) => prev.filter((x) => x._id !== item._id));
    } finally {
      setActingId(null);
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <Card className="p-4 mb-5">
      <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
        Repeat pickups
      </h2>
      <AnimatePresence initial={false}>
        <div className="space-y-2">
          {items.map((item) => (
            <motion.div
              key={item._id}
              layout
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="flex items-center justify-between gap-3 flex-wrap text-sm border border-line rounded-ticket px-3 py-2"
            >
              <div>
                <span className="font-semibold text-ink">{TYPE_LABELS[item.scrapType] || item.scrapType}</span>
                <span className="text-inkFaint"> · {FREQUENCY_LABELS[item.frequency]}</span>
                {item.active && (
                  <div className="text-xs text-inkFaint font-mono mt-0.5">
                    Next: {new Date(item.nextRunAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`stamp ${item.active ? "stamp-accepted" : "stamp-cancelled"}`}>
                  {item.active ? "Active" : "Paused"}
                </span>
                <button
                  onClick={() => handleToggle(item)}
                  disabled={actingId === item._id}
                  className="text-xs font-semibold text-rust hover:underline"
                >
                  {item.active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={actingId === item._id}
                  className="text-xs font-semibold text-inkFaint hover:text-danger"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </Card>
  );
}