import { useEffect, useState } from "react";
import Card from "../ui/Card";
import BadgeRow from "../collector/BadgeRow";
import { formatCompletionRate } from "../../utils/formatDuration";
import { getMyReputation } from "../../services/pickupService";

/**
 * The requester-side counterpart to everything collectors already get in
 * their Wallet tab (LeaderboardPanel, AchievementsPanel, the profile
 * card's own stats row) — rating, completion rate, badges, and recent
 * reviews left by collectors, but about the requester's own account.
 * Lives on the shared Profile page, shown only when `role === "user"`
 * (see Profile.jsx), since a collector has their own equivalent view on
 * their dashboard instead.
 */
export default function MyReputationCard() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    getMyReputation()
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

  // Fails quietly — this is supplementary context on an account-settings
  // page, not something that should visibly break Profile if it fails.
  if (state.status === "error") return null;

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display font-semibold text-ink mb-1.5">My reputation</h2>
      <p className="text-sm text-inkSoft mb-5">What collectors see about you when you request a pickup.</p>

      {state.status === "loading" && (
        <div className="space-y-3">
          <div className="h-5 w-1/3 rounded bg-line/40 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-line/30 animate-pulse" />
        </div>
      )}

      {state.status === "ready" && state.data && (
        <>
          <div className="flex items-center gap-1.5 text-sm">
            {state.data.ratingCount > 0 ? (
              <span className="flex items-center gap-1">
                <span className="text-rust">★</span>
                <span className="font-semibold text-ink">{state.data.rating.toFixed(1)}</span>
                <span className="text-inkFaint">({state.data.ratingCount} ratings)</span>
              </span>
            ) : (
              <span className="text-inkFaint">No ratings yet</span>
            )}
          </div>

          {state.data.badges?.length > 0 && (
            <div className="mt-3">
              <BadgeRow badges={state.data.badges} />
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dashed border-line text-sm flex-wrap">
            <span className="text-inkSoft">
              <span className="font-semibold text-ink">{state.data.completedCount}</span> pickups requested
            </span>
            {formatCompletionRate(state.data.completionRate) && (
              <span className="text-inkSoft">
                · <span className="font-semibold text-ink">{formatCompletionRate(state.data.completionRate)}</span>{" "}
                completion rate
              </span>
            )}
          </div>

          {state.data.recentReviews?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed border-line space-y-2">
              {state.data.recentReviews.map((review) => (
                <div key={review.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-rust leading-none">
                      {"★".repeat(review.score)}
                      <span className="text-line">{"★".repeat(5 - review.score)}</span>
                    </span>
                    <span className="text-inkFaint">— {review.fromName}</span>
                  </div>
                  <p className="text-inkSoft leading-snug">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}