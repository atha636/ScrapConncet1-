import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollectorReviews } from "../../services/pickupService";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import Card from "../../components/ui/Card";

const PAGE_SIZE = 10;

/**
 * The page behind CollectorProfileCard/PublicProfile's "See all reviews"
 * link. Public — no auth — matching the backend route (see
 * pickupRoutes' /reviews and its own rate limiter), so it works the same
 * way whether it's opened from inside the app or from a bare shared URL.
 *
 * "Load more" rather than numbered pages: this is a feed meant to be
 * skimmed top-to-bottom, not a table someone needs to jump around in, so
 * accumulating results as the person scrolls is the simpler interaction —
 * and it's what avoids needing to keep scroll position across a full page
 * swap.
 */
export default function CollectorReviews() {
  const { id } = useParams();

  // Same "which id/page does this result belong to" shape as
  // CollectorProfileCard/PublicProfile — see their own comments for why
  // this avoids a synchronous setState at the top of the effect.
  const [state, setState] = useState({
    id: null,
    page: 0,
    status: "loading",
    reviews: [],
    total: 0,
    totalPages: 0,
  });

  useDocumentMeta({ title: "Reviews · ScrapConnect", noindex: false });

  // Resets to page 1 whenever `id` changes (a fresh mount for a different
  // collector) — deliberately NOT including `state.page` here, since
  // "load more" advances the page via its own handler below, not by this
  // effect re-running.
  useEffect(() => {
    let cancelled = false;
    getCollectorReviews(id, 1, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setState({
          id,
          page: 1,
          status: "ready",
          reviews: res.data.data,
          total: res.data.total,
          totalPages: res.data.totalPages,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, id, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMore = () => {
    const nextPage = state.page + 1;
    setState((s) => ({ ...s, status: "loading_more" }));
    getCollectorReviews(id, nextPage, PAGE_SIZE)
      .then((res) => {
        setState((s) => ({
          ...s,
          page: nextPage,
          status: "ready",
          reviews: [...s.reviews, ...res.data.data],
        }));
      })
      .catch(() => {
        setState((s) => ({ ...s, status: "ready" }));
      });
  };

  const isInitialLoading = state.id !== id;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto">
        <Link
          to={`/collector/${id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-inkSoft hover:text-rust mb-4"
        >
          ← Back to profile
        </Link>

        <h1 className="font-display font-bold text-xl text-ink mb-1">Reviews</h1>
        {!isInitialLoading && state.status !== "error" && (
          <p className="text-sm text-inkFaint mb-6">{state.total} written reviews</p>
        )}

        {isInitialLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4">
                <div className="h-4 w-1/3 rounded bg-line/40 animate-pulse mb-2" />
                <div className="h-3 w-full rounded bg-line/30 animate-pulse" />
              </Card>
            ))}
          </div>
        )}

        {!isInitialLoading && state.status === "error" && (
          <Card className="p-6 text-center">
            <p className="text-sm text-inkSoft">
              Couldn't load reviews for this collector. The link may be broken.
            </p>
          </Card>
        )}

        {!isInitialLoading && state.status !== "error" && state.reviews.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-inkSoft">No written reviews yet.</p>
          </Card>
        )}

        {!isInitialLoading && state.reviews.length > 0 && (
          <div className="space-y-3">
            {state.reviews.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-rust leading-none text-sm">
                    {"★".repeat(review.score)}
                    <span className="text-line">{"★".repeat(5 - review.score)}</span>
                  </span>
                  <span className="text-xs text-inkFaint">
                    — {review.fromName} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-inkSoft leading-snug">{review.comment}</p>
              </Card>
            ))}
          </div>
        )}

        {!isInitialLoading && state.page < state.totalPages && (
          <button
            onClick={loadMore}
            disabled={state.status === "loading_more"}
            className="w-full mt-4 py-2.5 text-sm font-semibold text-rust border border-dashed border-line rounded-ticket hover:border-rust/40 transition-colors disabled:opacity-50"
          >
            {state.status === "loading_more" ? "Loading…" : "Load more reviews"}
          </button>
        )}
      </div>
    </div>
  );
}