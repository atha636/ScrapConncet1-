import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getDemandHeatmap } from "../../services/pickupService";

// Same rust used everywhere else in the UI (see index.css's --c-rust),
// not a Tailwind class — Leaflet's SVG layer needs a literal color string,
// it can't resolve CSS variables or utility classes.
const RUST = "#A63D24";

/**
 * Answers a question getAvailable and SuggestedBatchPanel both leave
 * unanswered: not "what can I take right now" but "where should I even
 * be." Bins nearby pending pickups into a coarse grid server-side (see
 * getDemandHeatmap's own comment on why binning is also the privacy
 * layer) and draws each cell as a circle sized and colored by how many
 * pending pickups are in it — a real density map, not a pin dump.
 */
export default function DemandHeatmapModal({ open, onClose, coords }) {
  // Same reasoning as SuggestedBatchPanel's fix: no separate "loading"
  // flag set synchronously at the top of the effect (that's what
  // react-hooks/set-state-in-effect flags) — instead a ref-counted
  // request id lets "is this the latest fetch, still in flight" be
  // derived during render, while setState itself only ever fires inside
  // the async .then/.catch callbacks below.
  const requestIdRef = useRef(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!open || !coords) return;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    getDemandHeatmap(coords.lat, coords.lng)
      .then((res) => setState({ status: "ready", data: res.data, requestId }))
      .catch(() => setState({ status: "error", data: null, requestId }));
    // Re-fetches only when the modal is (re)opened, not on every render —
    // deliberately excludes `coords` reference churn from a geolocation
    // hook that can fire repeatedly while the modal sits open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isLoading = open && coords && state?.requestId !== requestIdRef.current;
  const status = isLoading ? "loading" : state?.status || "loading";
  const points = state?.data?.points || [];
  const maxCount = points.reduce((m, p) => Math.max(m, p.count), 1);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="ticket w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised shrink-0">
              <div>
                <div className="font-display font-semibold text-ink text-sm">Demand near you</div>
                <div className="text-xs text-inkFaint mt-0.5">
                  {status === "ready"
                    ? `${state.data.totalPending} pending pickup${state.data.totalPending === 1 ? "" : "s"} within ${state.data.radiusKm} km`
                    : "Where pending pickups are clustering right now"}
                </div>
              </div>
              <motion.button
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-inkFaint hover:text-rust hover:bg-rust/[0.06]"
                aria-label="Close demand map"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>

            <div className="relative" style={{ height: 380 }}>
              {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-line/20 z-[1000]">
                  <span className="text-sm text-inkFaint">Loading demand…</span>
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface z-[1000]">
                  <span className="text-sm text-inkFaint">Couldn't load demand right now.</span>
                </div>
              )}
              {coords && (
                <MapContainer
                  center={[coords.lat, coords.lng]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {/* Collector's own position, distinct from any demand cell. */}
                  <CircleMarker center={[coords.lat, coords.lng]} radius={6} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 1 }}>
                    <Tooltip>You are here</Tooltip>
                  </CircleMarker>
                  {points.map((p) => {
                    // Relative intensity, not absolute count, so a quiet
                    // area still shows visible variation instead of every
                    // cell looking identically faint next to one busy
                    // one — deliberately not a bare min/max on radius
                    // alone, which would make single-pickup cells nearly
                    // invisible whenever anything nearby has a lot more.
                    const intensity = p.count / maxCount;
                    return (
                      <CircleMarker
                        key={`${p.lat}_${p.lng}`}
                        center={[p.lat, p.lng]}
                        radius={10 + intensity * 22}
                        pathOptions={{
                          color: RUST,
                          weight: 1,
                          fillColor: RUST,
                          fillOpacity: 0.15 + intensity * 0.45,
                        }}
                      >
                        <Tooltip>
                          {p.count} pending pickup{p.count === 1 ? "" : "s"}
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              )}
            </div>

            <div className="px-5 py-3 border-t border-line bg-surfaceRaised shrink-0 text-[11px] text-inkFaint">
              Circle size and shade reflect how many pending pickups are grouped in that area — not exact addresses.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}