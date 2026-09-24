import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getNearbyCollectors, inviteCollector } from "../../services/pickupService";
import { useToast } from "../../context/ToastContext";
import { formatPrice } from "../../utils/formatPrice";

/**
 * The write side of pick-your-collector: browse a short list of nearby,
 * currently-available collectors and invite one specific person instead
 * of leaving the pickup open to whoever taps Accept first. An invite is
 * just a negotiation opened from the requester's side (see
 * inviteCollector's own backend comment) — once sent, the rest of the
 * back-and-forth happens in the normal OfferPanel thread on this same
 * pickup, so this modal's only job is "who," not "how much."
 */
export default function PickCollectorModal({ open, onClose, pickup, onInvited }) {
  // Ref-counted request id, same fix as DemandHeatmapModal/
  // SuggestedBatchPanel earlier — setState only ever fires inside the
  // async .then/.catch below, never synchronously at the top of the
  // effect, so this never trips react-hooks/set-state-in-effect.
  const requestIdRef = useRef(0);
  const [state, setState] = useState(null);
  const [invitingId, setInvitingId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open || !pickup) return;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    getNearbyCollectors(pickup._id)
      .then((res) => setState({ status: "ready", data: res.data, requestId }))
      .catch((err) =>
        setState({
          status: "error",
          message: err.response?.data?.message || "Couldn't load nearby collectors.",
          requestId,
        })
      );
  }, [open, pickup]);

  const isLoading = open && pickup && state?.requestId !== requestIdRef.current;
  const status = isLoading ? "loading" : state?.status || "loading";
  const collectors = state?.data || [];

  const handleInvite = async (collector) => {
    setInvitingId(collector.collectorId);
    try {
      await inviteCollector(pickup._id, { collectorId: collector.collectorId });
      showToast({
        title: "Invite sent",
        message: `${collector.name} has been invited — you'll be notified once they respond.`,
      });
      onInvited?.();
      onClose();
    } catch (err) {
      showToast({
        title: "Couldn't send invite",
        message: err.response?.data?.message || "Something went wrong — try again.",
        type: "error",
      });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && pickup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="ticket w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised shrink-0">
              <div>
                <div className="font-display font-semibold text-ink text-sm">Choose a collector</div>
                <div className="text-xs text-inkFaint mt-0.5">Nearby and available right now</div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-inkFaint hover:text-rust hover:bg-rust/[0.06]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2.5">
              {status === "loading" && (
                <>
                  <div className="h-16 rounded-ticket bg-line/30 animate-pulse" />
                  <div className="h-16 rounded-ticket bg-line/30 animate-pulse" />
                </>
              )}

              {status === "error" && <p className="text-sm text-inkFaint py-6 text-center">{state.message}</p>}

              {status === "ready" && collectors.length === 0 && (
                <p className="text-sm text-inkFaint py-6 text-center leading-relaxed">
                  No collectors are nearby and available right now. Leave the request open — any
                  collector browsing the area can still accept it as usual.
                </p>
              )}

              {status === "ready" &&
                collectors.map((c) => (
                  <div
                    key={c.collectorId}
                    className="flex items-center justify-between gap-3 rounded-ticket border border-line px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-inkSoft">
                        {c.ratingCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <span className="text-rust">★</span>
                            <span className="font-semibold text-ink">{c.rating.toFixed(1)}</span>
                            <span className="text-inkFaint">({c.ratingCount})</span>
                          </span>
                        ) : (
                          <span className="text-inkFaint">No ratings yet</span>
                        )}
                        <span className="text-inkFaint">·</span>
                        <span className="text-inkFaint">{c.distanceKm} km away</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInvite(c)}
                      disabled={invitingId === c.collectorId}
                      className="btn-primary !py-1.5 !px-3 text-xs shrink-0 disabled:opacity-50"
                    >
                      {invitingId === c.collectorId ? "Inviting…" : "Invite"}
                    </button>
                  </div>
                ))}
            </div>

            {pickup && (
              <div className="px-5 py-3 border-t border-line bg-surfaceRaised shrink-0 text-[11px] text-inkFaint">
                Inviting sends your listed price of {formatPrice(pickup.price)} — the collector can accept,
                counter, or decline.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}