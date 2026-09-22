import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSuggestedBatch } from "../../services/pickupService";
import { formatPrice } from "../../utils/formatPrice";

/**
 * Surfaces a ready-made cluster of nearby *pending* pickups — the ones
 * still up for grabs, not yet this collector's — so accepting several in
 * one trip doesn't depend on the collector eyeballing the Available list
 * and guessing which ones happen to be close together.
 *
 * Deliberately doesn't accept anything itself. It hands the suggested ids
 * to `onSelect`, which the dashboard wires to the exact same selection
 * state the manual checkboxes use — so the existing "N selected → Accept
 * N" bar and batch-accept flow does the actual work, and this panel is
 * just a smarter way of arriving at a selection.
 */
export default function SuggestedBatchPanel({ coords, onSelect, selectedIds }) {
  const [state, setState] = useState({ status: "idle", data: null });

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setState({ status: "loading", data: null });
    getSuggestedBatch(coords.lat, coords.lng)
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

  // Same reasoning as RoutePlanner — no position, nothing to cluster
  // from, and the backend 400s without coordinates anyway.
  if (!coords) return null;
  if (state.status === "idle" || state.status === "loading") {
    return <div className="h-24 rounded-ticket bg-line/30 animate-pulse mb-4" />;
  }
  if (state.status === "error") return null;

  const { stops, ids, totalKm, candidatesInRadius } = state.data;

  // Nothing pending nearby at all — distinct from "plenty nearby, too
  // spread out," which still deserves an explanation rather than silence.
  if (candidatesInRadius === 0) return null;

  // A single stop isn't a "batch" — the manual list already shows it,
  // and a one-stop trip needs no route suggestion.
  if (stops.length < 2) return null;

  const alreadySelected = ids.every((id) => selectedIds.has(id));
  const totalValue = stops.reduce((sum, s) => sum + (s.pickup.price || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-4 rounded-ticket border border-rust/30 bg-rust/[0.04] p-3.5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-semibold text-rust uppercase tracking-wide mb-0.5">
            Suggested batch
          </h3>
          <p className="text-xs text-inkFaint">
            {stops.length} pickups within ~{totalKm} km of each other, near you
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(alreadySelected ? [] : ids)}
          className={
            alreadySelected
              ? "shrink-0 text-xs font-semibold text-inkSoft hover:text-ink px-3 py-1.5 rounded-full border border-line"
              : "shrink-0 btn-primary !py-1.5 !px-3.5 text-xs"
          }
        >
          {alreadySelected ? "Deselect" : `Select all ${stops.length}`}
        </button>
      </div>

      <ol className="space-y-2">
        {stops.map((stop) => (
          <li key={stop.pickup._id} className="flex items-center gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-rust/10 border border-rust/25 text-rust text-[11px] font-bold flex items-center justify-center">
              {stop.order}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink truncate">
                {stop.pickup.scrapType}
                {stop.pickup.estimatedWeightKg ? ` · ${stop.pickup.estimatedWeightKg}kg` : ""}
              </span>
              <span className="block text-xs text-inkFaint truncate">
                {stop.pickup.location?.address || "No address given"}
              </span>
            </span>
            <span className="shrink-0 text-xs text-inkSoft">{stop.legKm} km</span>
          </li>
        ))}
      </ol>

      <p className="text-[11px] text-inkFaint mt-3 leading-snug">
        Straight-line estimates, ordered from your current position.
        {totalValue > 0 && <> Worth about {formatPrice(totalValue)} total if all are accepted.</>}
      </p>
    </motion.div>
  );
}