import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getCollectorRoute } from "../../services/pickupService";

/**
 * Orders a collector's active jobs (accepted + in_progress) into an
 * efficient driving sequence from wherever they currently are, instead of
 * the "most recently updated" order the My Jobs list otherwise shows —
 * which has nothing to do with geography and can easily send someone
 * back and forth across a city.
 *
 * Distances are straight-line estimates, not road distances (see
 * routeOptimizer.js for why) — labelled as approximate below so the
 * numbers don't read as turn-by-turn precision they don't have.
 */
export default function RoutePlanner({ coords, onOpenPickup }) {
  const [state, setState] = useState({ status: "idle", data: null });

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    getCollectorRoute(coords.lat, coords.lng)
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  // Without a position there's no route to plan from — the backend
  // requires coordinates and 400s without them, so this stays silent
  // rather than showing a broken-looking empty panel.
  if (!coords) return null;

  if (state.status === "idle") {
    return <div className="h-24 rounded-ticket bg-line/30 animate-pulse mb-4" />;
  }

  if (state.status === "error") return null;

  const { stops, totalKm, savedKm } = state.data;

  // One stop can't be reordered into anything, so a "route" for it is just
  // noise next to the job list that already shows it.
  if (stops.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-4 rounded-ticket border border-line bg-surfaceRaised p-3.5"
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-xs font-semibold text-inkFaint uppercase tracking-wide">Suggested route</h3>
        <span className="text-xs text-inkFaint">~{totalKm} km total</span>
      </div>

      {savedKm > 0.1 && (
        <div className="text-xs text-rust font-semibold mb-3">
          Saves about {savedKm} km vs. your current job order
        </div>
      )}

      <ol className="space-y-2">
        {stops.map((stop) => (
          <li key={stop.pickup._id}>
            <button
              onClick={() => onOpenPickup?.(stop.pickup)}
              className="w-full flex items-center gap-2.5 text-left group"
            >
              <span className="shrink-0 w-5 h-5 rounded-full bg-rust/10 border border-rust/25 text-rust text-[11px] font-bold flex items-center justify-center">
                {stop.order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink truncate group-hover:text-rust transition-colors">
                  {stop.pickup.scrapType}
                  {stop.pickup.estimatedWeightKg ? ` · ${stop.pickup.estimatedWeightKg}kg` : ""}
                </span>
                <span className="block text-xs text-inkFaint truncate">
                  {stop.pickup.location?.address || "No address given"}
                </span>
              </span>
              <span className="shrink-0 text-xs text-inkSoft">{stop.legKm} km</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="text-[11px] text-inkFaint mt-3 leading-snug">
        Straight-line estimates — actual driving distance will be longer.
      </p>
    </motion.div>
  );
}