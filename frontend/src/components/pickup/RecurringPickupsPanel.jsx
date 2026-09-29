import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getMyRecurring,
  toggleRecurring,
  deleteRecurring,
  skipNextRecurring,
  pauseRecurring,
  updateRecurring,
  RECURRING_FREQUENCIES,
} from "../../services/pickupService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";
import Card from "../ui/Card";

const FREQUENCY_LABELS = { weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

const PAUSE_PRESETS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDay = (value) =>
  new Date(value).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

// <input type="date"> gives "YYYY-MM-DD"; new Date(that) would be UTC
// midnight, which is the previous evening in India. Building it from
// parts gives local midnight — "back on the 20th" means the 20th here.
const localMidnight = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const tomorrowInputValue = () => {
  const t = new Date(Date.now() + DAY_MS);
  const pad = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
};

const errorMessage = (err) =>
  err.response?.data?.details?.[0]?.message || err.response?.data?.message || "Something went wrong — try again.";

/**
 * One repeat-pickup row. Lives at module scope (not inside the panel's
 * render) so its open/closed menu state survives the panel re-rendering
 * whenever any other row changes.
 */
function RecurringRow({ item, busy, onSkip, onPause, onToggle, onDelete, onSave }) {
  // "none" | "pause" | "edit" — one inline menu at a time keeps the row
  // from growing into a form.
  const [menu, setMenu] = useState("none");
  const [customDate, setCustomDate] = useState("");
  const [frequency, setFrequency] = useState(item.frequency);
  const [weight, setWeight] = useState(item.estimatedWeightKg ?? "");

  // Captured once at mount via a lazy initializer — reading the clock
  // directly in render is impure (react-hooks/purity) and would make the
  // row's "Away"/"Skipped" state flicker on unrelated re-renders. The
  // trade-off is that a dated pause expiring while this page sits open
  // keeps reading "Away" until the next load, which is harmless: the
  // server has already resumed the series by then.
  const [now] = useState(() => Date.now());
  const [minPauseDate] = useState(tomorrowInputValue);
  const datedPause = item.active && item.pausedUntil && new Date(item.pausedUntil).getTime() > now;
  const openPause = !item.active;
  const justSkipped = item.active && item.skippedRunAt && new Date(item.skippedRunAt).getTime() > now - DAY_MS;

  const pauseFor = async (until) => {
    if (await onPause(item, until)) setMenu("none");
  };

  const saveEdit = async () => {
    const data = {};
    if (frequency !== item.frequency) data.frequency = frequency;
    const nextWeight = weight === "" ? undefined : Number(weight);
    if (nextWeight !== undefined && nextWeight !== item.estimatedWeightKg) data.estimatedWeightKg = nextWeight;
    if (Object.keys(data).length === 0) return setMenu("none");
    if (await onSave(item, data)) setMenu("none");
  };

  const linkBtn = "text-xs font-semibold hover:underline disabled:opacity-50";

  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="border border-line rounded-ticket px-3 py-2.5 text-sm"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="font-semibold text-ink">{SCRAP_TYPE_LABELS[item.scrapType] || item.scrapType}</span>
          {item.estimatedWeightKg ? <span className="text-inkFaint"> · {item.estimatedWeightKg}kg</span> : null}
          <span className="text-inkFaint"> · {FREQUENCY_LABELS[item.frequency]}</span>

          <div className="text-xs text-inkFaint font-mono mt-0.5">
            {openPause && "Paused until you resume"}
            {datedPause && `Paused until ${formatDay(item.pausedUntil)} · resumes ${formatDay(item.nextRunAt)}`}
            {item.active && !datedPause && `Next: ${formatDay(item.nextRunAt)}`}
          </div>
          {justSkipped && (
            <div className="text-[11px] text-inkFaint mt-0.5">Skipped {formatDay(item.skippedRunAt)}</div>
          )}
        </div>

        <span className={`stamp ${item.active && !datedPause ? "stamp-accepted" : "stamp-cancelled"}`}>
          {datedPause ? "Away" : item.active ? "Active" : "Paused"}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap mt-2.5">
        {item.active && !datedPause && (
          <button onClick={() => onSkip(item)} disabled={busy} className={`${linkBtn} text-rust`}>
            Skip next
          </button>
        )}
        {datedPause && (
          <button onClick={() => pauseFor(null)} disabled={busy} className={`${linkBtn} text-rust`}>
            Resume now
          </button>
        )}
        {openPause && (
          <button onClick={() => onToggle(item)} disabled={busy} className={`${linkBtn} text-rust`}>
            Resume
          </button>
        )}
        {item.active && !datedPause && (
          <button
            onClick={() => setMenu(menu === "pause" ? "none" : "pause")}
            disabled={busy}
            className={`${linkBtn} text-inkSoft`}
          >
            Pause…
          </button>
        )}
        <button
          onClick={() => setMenu(menu === "edit" ? "none" : "edit")}
          disabled={busy}
          className={`${linkBtn} text-inkSoft`}
        >
          Edit
        </button>
        <button onClick={() => onDelete(item)} disabled={busy} className="text-xs font-semibold text-inkFaint hover:text-danger ml-auto">
          Cancel series
        </button>
      </div>

      {menu === "pause" && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-line">
          <div className="text-xs text-inkFaint mb-1.5">Pause for</div>
          <div className="flex flex-wrap items-center gap-2">
            {PAUSE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => pauseFor(new Date(Date.now() + p.days * DAY_MS).toISOString())}
                disabled={busy}
                className="text-xs font-semibold border border-line rounded-full px-3 py-1 hover:border-rust hover:text-rust disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => onToggle(item)}
              disabled={busy}
              className="text-xs font-semibold border border-line rounded-full px-3 py-1 hover:border-rust hover:text-rust disabled:opacity-50"
            >
              Until I resume
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-inkFaint" htmlFor={`pause-date-${item._id}`}>
              Or until
            </label>
            <input
              id={`pause-date-${item._id}`}
              type="date"
              min={minPauseDate}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="field-input !py-1 !px-2 text-xs !w-auto"
            />
            <button
              onClick={() => customDate && pauseFor(localMidnight(customDate).toISOString())}
              disabled={busy || !customDate}
              className="text-xs font-semibold text-rust hover:underline disabled:opacity-40"
            >
              Pause
            </button>
          </div>
        </div>
      )}

      {menu === "edit" && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-line flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-inkFaint mb-1" htmlFor={`freq-${item._id}`}>
              How often
            </label>
            <select
              id={`freq-${item._id}`}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="field-input !py-1 !px-2 text-xs !w-auto"
            >
              {RECURRING_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-inkFaint mb-1" htmlFor={`weight-${item._id}`}>
              Approx. kg
            </label>
            <input
              id={`weight-${item._id}`}
              type="number"
              min="0"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="field-input !py-1 !px-2 text-xs !w-24"
            />
          </div>
          <button onClick={saveEdit} disabled={busy} className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50">
            Save
          </button>
          <button onClick={() => setMenu("none")} className="text-xs font-semibold text-inkFaint hover:text-ink">
            Close
          </button>
        </div>
      )}
    </motion.div>
  );
}

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
  const [error, setError] = useState("");

  useEffect(() => {
    getMyRecurring()
      .then((res) => setItems(res.data))
      .catch(() => {}) // non-critical panel — a failed load just means it stays hidden, not a page-breaking error
      .finally(() => setLoading(false));
  }, []);

  // Every action follows the same shape — mark the row busy, run the call,
  // swap the returned template in, surface a failure instead of swallowing
  // it. Resolves true/false so a row knows whether to close its own menu.
  const act = async (item, call, { remove = false } = {}) => {
    setActingId(item._id);
    setError("");
    try {
      const res = await call();
      // Read off the response here, inside the try — a state updater runs
      // during render, so anything it throws bypasses this catch and takes
      // the whole panel down instead of showing an error.
      const updated = remove ? null : res.data;
      if (!remove && !updated) throw new Error("Empty response");
      setItems((prev) =>
        remove ? prev.filter((x) => x._id !== item._id) : prev.map((x) => (x._id === item._id ? updated : x))
      );
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setActingId(null);
    }
  };

  const handleSkip = (item) => act(item, () => skipNextRecurring(item._id));
  const handlePause = (item, until) => act(item, () => pauseRecurring(item._id, until));
  const handleToggle = (item) => act(item, () => toggleRecurring(item._id));
  const handleSave = (item, data) => act(item, () => updateRecurring(item._id, data));
  const handleDelete = (item) => {
    if (!window.confirm(`Cancel your ${FREQUENCY_LABELS[item.frequency].toLowerCase()} ${item.scrapType} pickup?`)) return;
    return act(item, () => deleteRecurring(item._id), { remove: true });
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

      {error && (
        <div role="alert" className="text-xs text-danger bg-danger/[0.06] border border-danger/20 rounded-md px-3 py-2 mb-2.5">
          {error}
        </div>
      )}

      <AnimatePresence initial={false}>
        <div className="space-y-2">
          {items.map((item) => (
            <RecurringRow
              key={item._id}
              item={item}
              busy={actingId === item._id}
              onSkip={handleSkip}
              onPause={handlePause}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onSave={handleSave}
            />
          ))}
        </div>
      </AnimatePresence>
    </Card>
  );
}