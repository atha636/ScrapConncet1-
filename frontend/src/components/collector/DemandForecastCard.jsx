import { useState } from "react";
import { getDemandForecast } from "../../services/pickupService";

const hourLabel = (h) => {
  const hh = ((h % 24) + 24) % 24;
  const suffix = hh < 12 ? "am" : "pm";
  return `${hh % 12 === 0 ? 12 : hh % 12} ${suffix}`;
};

const LEVEL = {
  busy: { text: "Busy right now", tone: "text-emerald-700" },
  moderate: { text: "Moderate right now", tone: "text-amber-dark" },
  quiet: { text: "Quiet right now", tone: "text-inkFaint" },
};

const CONFIDENCE = {
  low: "Early estimate — little history nearby yet.",
  medium: "Based on the last few weeks of requests nearby.",
  high: "Based on several weeks of requests nearby.",
};

/**
 * "When and where is it busy" for a collector — the time dimension the
 * live heatmap doesn't have. Loads only when opened, so it costs nothing
 * for collectors who never look.
 */
export default function DemandForecastCard({ coords }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: "idle", data: null });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && state.status === "idle") {
      setState({ status: "loading", data: null });
      getDemandForecast(coords.lat, coords.lng)
        .then((res) => setState({ status: "ready", data: res.data }))
        .catch(() => setState({ status: "error", data: null }));
    }
  };

  const d = state.data;
  const peak = d?.enough ? Math.max(...d.hours, 0.1) : 1;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-inkSoft hover:text-rust"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        When is it busy?
      </button>

      {open && (
        <div className="mt-2 rounded-ticket border border-line bg-surfaceRaised/60 p-3.5">
          {state.status === "loading" && <div className="h-20 rounded-md bg-line/30 animate-pulse" />}
          {state.status === "error" && (
            <p className="text-xs text-inkFaint">Couldn't load the forecast. Try again in a moment.</p>
          )}

          {state.status === "ready" && !d.enough && (
            <p className="text-xs text-inkFaint leading-relaxed">
              Not enough requests have come in around you yet to forecast. It gets better as more pickups are
              booked nearby.
            </p>
          )}

          {state.status === "ready" && d.enough && (
            <>
              <p className={`text-sm font-semibold ${LEVEL[d.nowLevel].tone}`}>{LEVEL[d.nowLevel].text}</p>

              {d.bestWindows.length > 0 && (
                <p className="text-xs text-inkSoft mt-1">
                  Best times today:{" "}
                  {d.bestWindows.map((w, i) => (
                    <span key={w.start}>
                      {i > 0 && " · "}
                      <span className="font-semibold text-ink">
                        {hourLabel(w.start)}–{hourLabel(w.end)}
                      </span>
                    </span>
                  ))}
                </p>
              )}

              {/* Requests by hour, typically, for today's weekday */}
              <div className="mt-3 flex items-end gap-[3px] h-14" role="img" aria-label="Typical requests by hour today">
                {d.hours.map((v, h) => (
                  <div
                    key={h}
                    className={`flex-1 rounded-sm ${h === d.hourNow ? "bg-rust" : "bg-rust/30"}`}
                    style={{ height: `${Math.max(4, (v / peak) * 100)}%` }}
                    title={`${hourLabel(h)}: about ${v} a week`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-inkFaint font-mono mt-1">
                <span>12 am</span>
                <span>6 am</span>
                <span>12 pm</span>
                <span>6 pm</span>
              </div>

              {d.areas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-line">
                  <p className="text-xs font-semibold text-ink mb-1.5">Busy areas around this hour</p>
                  <ul className="space-y-1.5">
                    {d.areas.map((a, i) => (
                      <li key={`${a.lat}_${a.lng}`} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-inkSoft">
                          Area {i + 1} · {a.distanceKm} km away · ~{a.expected} a week
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-rust hover:underline shrink-0"
                        >
                          Open map
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-inkFaint mt-3">
                {CONFIDENCE[d.confidence]} Areas are about {d.cellKm} km wide — a guide, not a guarantee.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}