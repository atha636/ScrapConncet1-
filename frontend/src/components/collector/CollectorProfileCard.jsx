import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getCollectorProfile } from "../../services/pickupService";

/**
 * Gives a requester a quick read on the collector assigned to their
 * pickup — rating, track record, and streak — instead of just a bare name.
 * Self-contained and fails quietly, matching LeaderboardPanel: this is
 * context that makes the pickup detail view better, not something that
 * should ever block or break it if the lookup fails.
 */
export default function CollectorProfileCard({ collectorId }) {
  // Loading and "is this the right profile" are both derived from comparing
  // the id a fetch was made for against the current collectorId, rather
  // than a separate `loading` state set synchronously inside the effect —
  // react-hooks/set-state-in-effect flags any setState called directly in
  // an effect body (even the ordinary "mark loading before an async call"
  // pattern), so nothing here is set outside the fetch's own .then/.catch
  // callbacks.
  const [result, setResult] = useState({ collectorId: null, profile: null });

  useEffect(() => {
    if (!collectorId) return;
    let cancelled = false;
    getCollectorProfile(collectorId)
      .then((res) => {
        if (!cancelled) setResult({ collectorId, profile: res.data });
      })
      .catch(() => {
        if (!cancelled) setResult({ collectorId, profile: null });
      });
    return () => {
      cancelled = true;
    };
  }, [collectorId]);

  const loading = !!collectorId && result.collectorId !== collectorId;
  const profile = result.collectorId === collectorId ? result.profile : null;

  if (loading) {
    return <div className="h-16 rounded-ticket bg-line/30 animate-pulse" />;
  }

  // No profile (lookup failed, or the collector account no longer
  // qualifies) — fall back to nothing rather than a broken-looking card.
  if (!profile) return null;

  const memberSinceLabel = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-ticket border border-line bg-surfaceRaised p-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-semibold text-ink truncate">{profile.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-inkSoft">
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
                <span className="text-inkFaint">Collecting since {memberSinceLabel}</span>
              </>
            )}
          </div>
        </div>

        {profile.streak > 0 && (
          <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-rust/[0.07] border border-rust/20 rounded-ticket text-xs">
            <span className="leading-none">🔥</span>
            <span className="font-semibold text-ink">{profile.streak}d</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-dashed border-line text-xs">
        <span className="text-inkSoft">
          <span className="font-semibold text-ink">{profile.completedCount}</span> pickups completed
        </span>
      </div>

      {profile.recentReviews?.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-line space-y-2">
          {profile.recentReviews.map((review) => (
            <div key={review.id} className="text-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-rust leading-none">
                  {"★".repeat(review.score)}
                  <span className="text-line">{"★".repeat(5 - review.score)}</span>
                </span>
                <span className="text-inkFaint">— {review.fromName}</span>
              </div>
              <p className="text-inkSoft leading-snug line-clamp-2">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}