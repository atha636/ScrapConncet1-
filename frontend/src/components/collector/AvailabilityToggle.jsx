import { useEffect, useState } from "react";
import { getMyAvailability, updateMyAvailability } from "../../services/pickupService";

/**
 * A compact pause/resume switch for the collector dashboard header —
 * separate from the fuller WorkingHoursCard (in the Wallet tab), since
 * this one thing (am I accepting jobs right now) is what a collector
 * needs to see and flip in a glance, every time they open the dashboard,
 * not something to go dig for in a settings panel.
 */
export default function AvailabilityToggle() {
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

  const togglePaused = async () => {
    if (!state.data || saving) return;
    const nextPaused = !state.data.paused;
    setSaving(true);
    try {
      const res = await updateMyAvailability({ paused: nextPaused });
      setState({ status: "ready", data: res.data });
    } finally {
      setSaving(false);
    }
  };

  // Fails quietly — this is a convenience toggle, not something that
  // should visibly break the dashboard header if the lookup fails.
  if (state.status !== "ready" || !state.data) return null;

  const { paused, isAvailableNow } = state.data;

  return (
    <button
      onClick={togglePaused}
      disabled={saving}
      title={
        paused
          ? "You're paused — tap to resume accepting jobs"
          : isAvailableNow
            ? "You're available — tap to pause"
            : "Outside your set working hours right now — tap to pause anyway"
      }
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
        isAvailableNow
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : "border-line bg-surfaceRaised text-inkFaint"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isAvailableNow ? "bg-emerald-500" : "bg-inkFaint"}`}
      />
      {paused ? "Paused" : isAvailableNow ? "Available" : "Outside hours"}
    </button>
  );
}