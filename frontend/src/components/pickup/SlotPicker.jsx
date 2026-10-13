import { useState } from "react";
import { SLOT_WINDOWS, buildDays, isSlotAvailable, slotRange, formatSlot } from "../../utils/pickupSlots";

// "As soon as possible" or a chosen day + window. Reports the choice upward
// as { start, end } ISO strings, or null for ASAP.
export default function SlotPicker({ onChange }) {
  const [now] = useState(() => new Date());
  const days = buildDays(now);
  const [mode, setMode] = useState("asap");
  const [dayIdx, setDayIdx] = useState(0);
  const [winKey, setWinKey] = useState(null);

  const report = (nextMode, nextDay, nextWin) => {
    if (nextMode === "asap" || !nextWin) return onChange(null);
    const win = SLOT_WINDOWS.find((w) => w.key === nextWin);
    const { start, end } = slotRange(days[nextDay], win);
    onChange({ start: start.toISOString(), end: end.toISOString() });
  };

  const pickMode = (m) => {
    setMode(m);
    report(m, dayIdx, winKey);
  };

  const pickDay = (i) => {
    setDayIdx(i);
    // Drop a window that isn't available on the newly chosen day
    const stillOk = winKey && isSlotAvailable(days[i], SLOT_WINDOWS.find((w) => w.key === winKey), now);
    const next = stillOk ? winKey : null;
    setWinKey(next);
    report(mode, i, next);
  };

  const pickWindow = (key) => {
    setWinKey(key);
    report(mode, dayIdx, key);
  };

  const chosen = winKey && mode === "schedule" ? slotRange(days[dayIdx], SLOT_WINDOWS.find((w) => w.key === winKey)) : null;

  return (
    <div>
      <label className="field-label">When should the collector come?</label>
      <div className="flex gap-2 mb-3">
        {[["asap", "As soon as possible"], ["schedule", "Pick a time"]].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => pickMode(k)}
            className={`text-sm font-semibold px-4 py-2 rounded-ticket border transition-colors ${
              mode === k ? "bg-rust text-white border-rust" : "border-line text-inkSoft hover:border-rust/50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {mode === "schedule" && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => {
              const anyLeft = SLOT_WINDOWS.some((w) => isSlotAvailable(d, w, now));
              return (
                <button
                  key={d.label}
                  type="button"
                  disabled={!anyLeft}
                  onClick={() => pickDay(i)}
                  className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-ticket border transition-colors disabled:opacity-40 ${
                    dayIdx === i ? "bg-rust/10 border-rust text-rust" : "border-line text-inkSoft"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SLOT_WINDOWS.map((w) => {
              const ok = isSlotAvailable(days[dayIdx], w, now);
              return (
                <button
                  key={w.key}
                  type="button"
                  disabled={!ok}
                  onClick={() => pickWindow(w.key)}
                  className={`text-center px-2 py-2.5 rounded-ticket border transition-colors disabled:opacity-40 ${
                    winKey === w.key ? "bg-rust/10 border-rust text-rust" : "border-line text-inkSoft hover:border-rust/50"
                  }`}
                >
                  <span className="block text-sm font-semibold">{w.label}</span>
                  <span className="block text-[11px]">{w.from > 12 ? w.from - 12 : w.from}{w.from >= 12 ? "pm" : "am"}–{w.to > 12 ? w.to - 12 : w.to}{w.to >= 12 ? "pm" : "am"}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-inkFaint">
            {chosen
              ? `The collector aims to arrive ${formatSlot({ start: chosen.start, end: chosen.end })}. You'll get a reminder an hour before.`
              : "Choose a window. The collector will aim to arrive within it."}
          </p>
        </div>
      )}
    </div>
  );
}