import { useEffect, useState } from "react";
import { getMyAvailability, updateMyAvailability } from "../../services/pickupService";

const DAYS = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

const DEFAULT_START = "09:00";
const DEFAULT_END = "18:00";

/**
 * Optional weekly working hours — separate from AvailabilityToggle's
 * quick pause switch, and independent of it (see
 * collectorAvailability.js: pause always wins, but doesn't require a
 * schedule to exist at all). Lives in the Wallet tab alongside the other
 * collector settings-ish panels (LeaderboardPanel, AchievementsPanel)
 * rather than the Dashboard header, since this is something set up once
 * and revisited occasionally, not glanced at every session.
 */
export default function WorkingHoursCard() {
  const [state, setState] = useState({ status: "loading", data: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyAvailability()
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <div className="h-40 rounded-ticket bg-line/30 animate-pulse mb-4" />;
  }
  if (state.status === "error" || !state.data) return null;

  const { scheduleEnabled, schedule } = state.data;
  const byDay = Object.fromEntries(schedule.map((s) => [s.day, s]));

  const save = async (nextEnabled, nextSchedule) => {
    setSaving(true);
    try {
      const res = await updateMyAvailability({ scheduleEnabled: nextEnabled, schedule: nextSchedule });
      setState({ status: "ready", data: res.data });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    const next = byDay[day]
      ? schedule.filter((s) => s.day !== day)
      : [...schedule, { day, start: DEFAULT_START, end: DEFAULT_END }];
    save(scheduleEnabled, next);
  };

  const updateDayTime = (day, field, value) => {
    const next = schedule.map((s) => (s.day === day ? { ...s, [field]: value } : s));
    save(scheduleEnabled, next);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-inkFaint uppercase tracking-wide">Working hours</h3>
        <label className="flex items-center gap-1.5 text-xs text-inkSoft cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            disabled={saving}
            onChange={(e) => save(e.target.checked, schedule)}
            className="accent-rust"
          />
          Enforce schedule
        </label>
      </div>

      {!scheduleEnabled && (
        <p className="text-xs text-inkFaint mb-2">
          Off — you can accept jobs anytime (unless manually paused above).
        </p>
      )}

      <div className={`space-y-1.5 ${scheduleEnabled ? "" : "opacity-50 pointer-events-none"}`}>
        {DAYS.map(({ day, label }) => {
          const entry = byDay[day];
          return (
            <div key={day} className="flex items-center gap-2.5 text-xs">
              <label className="flex items-center gap-1.5 w-16 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!entry}
                  disabled={saving}
                  onChange={() => toggleDay(day)}
                  className="accent-rust"
                />
                <span className={entry ? "text-ink font-medium" : "text-inkFaint"}>{label}</span>
              </label>
              {entry ? (
                <div className="flex items-center gap-1.5 text-inkSoft">
                  <input
                    type="time"
                    value={entry.start}
                    disabled={saving}
                    onChange={(e) => updateDayTime(day, "start", e.target.value)}
                    className="border border-line rounded-md px-1.5 py-0.5 bg-surface"
                  />
                  <span>–</span>
                  <input
                    type="time"
                    value={entry.end}
                    disabled={saving}
                    onChange={(e) => updateDayTime(day, "end", e.target.value)}
                    className="border border-line rounded-md px-1.5 py-0.5 bg-surface"
                  />
                </div>
              ) : (
                <span className="text-inkFaint">Day off</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}