import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getPublicCollectorProfile } from "../../services/pickupService";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import Card from "../../components/ui/Card";
import { formatAcceptTime, formatCompletionRate } from "../../utils/formatDuration";

/**
 * The page a collector's share link actually opens — no auth required (see
 * pickupRoutes' /profile/public route), reachable by anyone with the URL,
 * logged in or not. Deliberately a standalone page rather than reusing
 * CollectorProfileCard directly: that component is sized to sit inside a
 * pickup detail modal, whereas this needs its own loading/error/not-found
 * states since there's no surrounding page to fall back to if it fails.
 */
export default function PublicProfile() {
  const { id } = useParams();

  // Same shape as CollectorProfileCard's own state: "which id does this
  // result belong to" is tracked alongside the result itself, so "loading"
  // is *derived* by comparing it against the current id rather than a
  // separate setState call made synchronously at the top of the effect —
  // react-hooks/set-state-in-effect flags exactly that pattern, since it
  // triggers an extra render before the real one the fetch will cause.
  const [result, setResult] = useState({ id: null, status: "loading", profile: null });

  useEffect(() => {
    let cancelled = false;
    getPublicCollectorProfile(id)
      .then((res) => {
        if (!cancelled) setResult({ id, status: "ready", profile: res.data });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err.response?.status === 429 ? "rate_limited" : "not_found";
        setResult({ id, status, profile: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const state = result.id === id ? result : { status: "loading", profile: null };

  useDocumentMeta({
    title: state.profile ? `${state.profile.name} · Collector Profile` : "Collector Profile",
    description: state.profile
      ? `${state.profile.name} has completed ${state.profile.completedCount} pickups on ScrapConnect.`
      : undefined,
    // Indexable — this is meant to be shared and found, unlike the
    // authenticated pages elsewhere in the app.
    noindex: false,
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-mark.png" alt="" className="w-8 h-8 rounded-md rotate-[-3deg]" />
          <span className="font-display font-bold text-ink">ScrapConnect</span>
        </Link>

        {state.status === "loading" && (
          <Card className="p-6">
            <div className="h-5 w-2/3 rounded bg-line/40 animate-pulse mb-3" />
            <div className="h-4 w-1/2 rounded bg-line/30 animate-pulse mb-6" />
            <div className="h-16 rounded-ticket bg-line/30 animate-pulse" />
          </Card>
        )}

        {state.status === "not_found" && (
          <Card className="p-6 text-center">
            <h1 className="font-display font-bold text-lg text-ink mb-2">Profile not found</h1>
            <p className="text-sm text-inkSoft leading-relaxed">
              This link may be broken, or the collector's account is no longer active.
            </p>
          </Card>
        )}

        {state.status === "rate_limited" && (
          <Card className="p-6 text-center">
            <h1 className="font-display font-bold text-lg text-ink mb-2">Too many requests</h1>
            <p className="text-sm text-inkSoft leading-relaxed">
              This page is getting hit a lot right now — give it a minute and refresh.
            </p>
          </Card>
        )}

        {state.status === "ready" && state.profile && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display font-bold text-xl text-ink truncate">{state.profile.name}</h1>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-inkSoft">
                    {state.profile.ratingCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="text-rust">★</span>
                        <span className="font-semibold text-ink">{(state.profile.rating ?? 0).toFixed(1)}</span>
                        <span className="text-inkFaint">({state.profile.ratingCount})</span>
                      </span>
                    ) : (
                      <span className="text-inkFaint">No ratings yet</span>
                    )}
                  </div>
                  {state.profile.memberSince && (
                    <div className="text-xs text-inkFaint mt-0.5">
                      Collecting since{" "}
                      {new Date(state.profile.memberSince).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                {state.profile.streak > 0 && (
                  <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-rust/[0.07] border border-rust/20 rounded-ticket text-xs">
                    <span className="leading-none">🔥</span>
                    <span className="font-semibold text-ink">{state.profile.streak}d</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dashed border-line text-sm flex-wrap">
                <span className="text-inkSoft">
                  <span className="font-semibold text-ink">{state.profile.completedCount}</span> pickups completed
                </span>
                {formatAcceptTime(state.profile.avgAcceptMinutes) && (
                  <span className="text-inkSoft">
                    · Usually accepts within{" "}
                    <span className="font-semibold text-ink">{formatAcceptTime(state.profile.avgAcceptMinutes)}</span>
                  </span>
                )}
                {formatCompletionRate(state.profile.completionRate) && (
                  <span className="text-inkSoft">
                    ·{" "}
                    <span className="font-semibold text-ink">
                      {formatCompletionRate(state.profile.completionRate)}
                    </span>{" "}
                    completion rate
                  </span>
                )}
              </div>

              {state.profile.recentReviews?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-line space-y-3">
                  {state.profile.recentReviews.map((review) => (
                    <div key={review.id}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-rust leading-none text-sm">
                          {"★".repeat(review.score)}
                          <span className="text-line">{"★".repeat(5 - review.score)}</span>
                        </span>
                        <span className="text-xs text-inkFaint">— {review.fromName}</span>
                      </div>
                      <p className="text-sm text-inkSoft leading-snug">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <p className="text-center text-xs text-inkFaint mt-5">
              Need a pickup?{" "}
              <Link to="/register" className="font-semibold text-rust hover:underline">
                Get started on ScrapConnect
              </Link>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}