import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getRequesterProfile } from "../../services/pickupService";
import { formatCompletionRate } from "../../utils/formatDuration";
import BadgeRow from "../collector/BadgeRow";

/**
 * The requester-side mirror of CollectorProfileCard — opened from the
 * "Requested by X" line on the available-jobs list (see Dashboard.jsx), so
 * a collector can size someone up before committing to Accept, the same
 * way a requester already can for a collector on their own pickup.
 *
 * A modal rather than an inline card (unlike CollectorProfileCard): this
 * is reached from a dense, scrollable list of many job rows, so expanding
 * a card in place would reflow every row below it — a modal keeps the
 * list stable underneath.
 */
export default function RequesterProfileModal({ requesterId, open, onClose }) {
  // Same "which id does this result belong to" shape as
  // CollectorProfileCard — see its own comment for why loading is derived
  // by comparison rather than a synchronous setState in the effect body.
  const [result, setResult] = useState({ requesterId: null, profile: null, failed: false });

  useEffect(() => {
    if (!open || !requesterId) return;
    let cancelled = false;
    getRequesterProfile(requesterId)
      .then((res) => {
        if (!cancelled) setResult({ requesterId, profile: res.data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ requesterId, profile: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [open, requesterId]);

  const loading = open && result.requesterId !== requesterId;
  const profile = result.requesterId === requesterId ? result.profile : null;
  const failed = result.requesterId === requesterId && result.failed;

  const memberSinceLabel = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;
  const completionRateLabel = formatCompletionRate(profile?.completionRate);

  return (
    <AnimatePresence>
      {open && (
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
            className="ticket w-full max-w-sm p-6"
          >
            {loading && (
              <div>
                <div className="h-5 w-1/2 rounded bg-line/40 animate-pulse mb-3" />
                <div className="h-4 w-1/3 rounded bg-line/30 animate-pulse mb-6" />
                <div className="h-16 rounded-ticket bg-line/30 animate-pulse" />
              </div>
            )}

            {!loading && failed && (
              <div className="text-center py-2">
                <p className="text-sm text-inkSoft">Couldn't load this requester's profile right now.</p>
              </div>
            )}

            {!loading && profile && (
              <>
                <h3 className="font-display font-semibold text-lg text-ink truncate">{profile.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-inkSoft">
                  {profile.ratingCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="text-rust">★</span>
                      <span className="font-semibold text-ink">{profile.rating.toFixed(1)}</span>
                      <span className="text-inkFaint">({profile.ratingCount})</span>
                    </span>
                  ) : (
                    <span className="text-inkFaint">No ratings yet</span>
                  )}
                  {memberSinceLabel && (
                    <>
                      <span className="text-inkFaint">·</span>
                      <span className="text-inkFaint">On ScrapConnect since {memberSinceLabel}</span>
                    </>
                  )}
                </div>

                {profile.badges?.length > 0 && (
                  <div className="mt-3">
                    <BadgeRow badges={profile.badges} />
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dashed border-line text-sm flex-wrap">
                  <span className="text-inkSoft">
                    <span className="font-semibold text-ink">{profile.completedCount}</span> pickups requested
                  </span>
                  {completionRateLabel && (
                    <span className="text-inkSoft">
                      · <span className="font-semibold text-ink">{completionRateLabel}</span> completion rate
                    </span>
                  )}
                </div>
              </>
            )}

            <button
              onClick={onClose}
              className="w-full mt-5 py-2 text-sm font-semibold text-inkSoft border border-line rounded-ticket hover:border-rust/40 hover:text-rust transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}