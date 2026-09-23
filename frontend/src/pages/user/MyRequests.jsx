import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyRequests, cancelPickup, exportMyRequests, respondToOffer, createPickup } from "../../services/pickupService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import ChatBox from "../../components/chat/ChatBox";
import RatingModal from "../../components/rating/RatingModal";
import RequestDetailModal from "../../components/pickup/RequestDetailModal";
import ReportIssueModal from "../../components/pickup/ReportIssueModal";
import RecurringPickupsPanel from "../../components/pickup/RecurringPickupsPanel";
import { formatPrice } from "../../utils/formatPrice";
import { downloadBlob } from "../../utils/downloadBlob";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import { getRatings } from "../../services/ratingService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { hasUserRated } from "../../utils/ratings";
import { getPickupItems, formatItemsLabel, formatTotalWeight } from "../../utils/pickupItems";

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export default function MyRequests() {
  useDocumentMeta({ title: "My Requests", noindex: true });
  const { user } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatPickup, setChatPickup] = useState(null);
  const [ratePickup, setRatePickup] = useState(null);
  const [ratedIds, setRatedIds] = useState(new Set());
  const [cancellingId, setCancellingId] = useState(null);
  const [repeatingId, setRepeatingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [detailsPickup, setDetailsPickup] = useState(null);
  const [reportPickup, setReportPickup] = useState(null);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyRequests({ page: p, limit: 10 });
      setItems(res.data.data);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {
      setError("Couldn't load your requests. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  // items doesn't tell us whether *this* requester already rated a completed
  // pickup's collector — that only lives in the Rating collection. Check each
  // completed item once loaded so "Rate collector" doesn't show for ones already rated.
  useEffect(() => {
    const toCheck = items.filter((j) => j.status === "completed" && j.collector);
    if (toCheck.length === 0) return;

    let cancelled = false;
    Promise.all(
      toCheck.map((j) =>
        getRatings(j._id)
          .then((res) => ({ id: j._id, ratings: res.data }))
          .catch(() => ({ id: j._id, ratings: [] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const myId = user?._id;
      setRatedIds((prev) => {
        const next = new Set(prev);
        results.forEach(({ id, ratings }) => {
          if (hasUserRated(ratings, myId)) {
            next.add(id);
          }
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items, user?._id]);

  // Live-refresh when a collector accepts / updates one of this user's pickups
  useSocket("updatePickup", (updated) => {
    setItems((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setDetailsPickup((prev) => (prev && prev._id === updated._id ? updated : prev));
  });

  const handleCancel = async (item) => {
    if (!window.confirm("Cancel this pickup request?")) return false;
    setCancellingId(item._id);
    setError("");
    try {
      const res = await cancelPickup(item._id);
      setItems((prev) => prev.map((p) => (p._id === item._id ? res.data : p)));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't cancel this request.");
      return false;
    } finally {
      setCancellingId(null);
    }
  };

  // One tap on a past pickup's exact same items, contact and location — no
  // trip back through the request form. Only offered on a terminal pickup
  // (completed or cancelled, see the render check below) since anything
  // still pending/accepted/in_progress is already an active request; this
  // is for "I need this again," not a way to duplicate a live one.
  const handleRepeat = async (item) => {
    const pickupItems = getPickupItems(item);
    if (pickupItems.length === 0 || !item.location) {
      showToast({
        title: "Can't repeat this one",
        message: "This request is missing items or a location to reuse.",
        type: "error",
      });
      return;
    }

    setRepeatingId(item._id);
    try {
      const form = new FormData();
      form.append(
        "items",
        JSON.stringify(
          pickupItems.map((it) => ({ scrapType: it.scrapType, estimatedWeightKg: it.estimatedWeightKg || undefined }))
        )
      );
      form.append("contactName", item.contactName || user?.name || "");
      form.append("contactPhone", item.contactPhone || user?.phone || "");
      form.append("lat", item.location.lat);
      form.append("lng", item.location.lng);
      if (item.location.address) form.append("address", item.location.address);
      // Deliberately no image — the old photo belonged to the old pile,
      // reusing it here would misrepresent what's actually out for this
      // new pickup. The requester can attach a fresh one from the form if
      // they want a photo on this repeat.

      await createPickup(form);
      showToast({ title: "Pickup requested", message: "Same items, same spot — it's back at the top of your list." });
      load(1);
    } catch (err) {
      showToast({
        title: "Couldn't repeat this pickup",
        message: err.response?.data?.message || "Something went wrong — try again.",
        type: "error",
      });
    } finally {
      setRepeatingId(null);
    }
  };

  const handleRespondOffer = async (action, amount, note) => {
    if (!detailsPickup) return;
    setOfferSubmitting(true);
    setOfferError("");
    try {
      const res = await respondToOffer(detailsPickup._id, action, amount, note);
      setItems((prev) => prev.map((p) => (p._id === res.data._id ? res.data : p)));
      setDetailsPickup(res.data);
    } catch (err) {
      setOfferError(err.response?.data?.message || "Couldn't respond to that offer — try again.");
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await exportMyRequests();
      downloadBlob(res.data, `my-pickups-${Date.now()}.csv`);
    } catch {
      setError("Couldn't export your requests. Try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">My requests</h1>
          <p className="text-sm text-inkSoft mt-0.5">Every pickup you've scheduled, tracked here.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button onClick={handleExport} disabled={exporting} className="btn-secondary">
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          )}
          <Link to="/request" className="btn-primary">+ New request</Link>
        </div>
      </div>

      <RecurringPickupsPanel />

      {error && <div className="mb-5"><ErrorBox>{error}</ErrorBox></div>}

      {loading ? (
        <CardSkeleton count={3} withImage />
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="w-11 h-11 mx-auto mb-3 rounded-full border-2 border-dashed border-line flex items-center justify-center text-inkFaint">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
            </svg>
          </div>
          <p className="text-inkSoft mb-4">You haven't requested a pickup yet.</p>
          <Link to="/request" className="btn-primary inline-flex">Request your first pickup</Link>
        </Card>
      ) : (
        <>
          <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3">
            {items.map((item) => (
              <motion.div key={item._id} variants={listItem} layout>
                <Card
                  onClick={() => setDetailsPickup(item)}
                  className="p-5 pt-6 flex items-start justify-between gap-4 flex-wrap cursor-pointer transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,18,0.08)]"
                >
                  <div className="flex gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={getPickupItems(item).length === 1 ? getPickupItems(item)[0].scrapType : "Scrap pickup"}
                        className="w-16 h-16 rounded-md object-cover shrink-0 border border-line"
                      />
                    )}
                    <div>
                      <div className="font-display font-semibold text-ink">
                        {formatItemsLabel(getPickupItems(item))}
                        {formatTotalWeight(getPickupItems(item)) ? ` · ${formatTotalWeight(getPickupItems(item))}` : ""}
                      </div>
                      <div className="text-xs text-inkFaint mt-0.5 font-mono">
                        #{item._id.slice(-6).toUpperCase()} · {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      {item.collector && (
                        <div className="text-xs text-inkSoft mt-1.5">
                          Collector: <span className="font-medium text-ink">{item.collector.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-mono font-semibold text-ink">{formatPrice(item.price)}</span>
                    <StatusStamp status={item.status} />

                    {item.collector && item.status !== "cancelled" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setChatPickup(item); }}
                        className="text-xs font-semibold text-rust hover:underline flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        Chat
                      </button>
                    )}

                    {["pending", "accepted"].includes(item.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(item); }}
                        disabled={cancellingId === item._id}
                        className="text-xs font-semibold text-danger hover:underline"
                      >
                        {cancellingId === item._id ? "Cancelling…" : "Cancel request"}
                      </button>
                    )}

                    {item.status === "completed" && item.collector && !ratedIds.has(item._id) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setRatePickup(item); }}
                        className="text-xs font-semibold text-amber-dark hover:underline flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Rate collector
                      </button>
                    )}
                    {item.status === "completed" && item.collector && ratedIds.has(item._id) && (
                      <span className="text-xs font-semibold text-ink/50 flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Already rated
                      </span>
                    )}

                    {["completed", "cancelled"].includes(item.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRepeat(item); }}
                        disabled={repeatingId === item._id}
                        className="text-xs font-semibold text-inkSoft hover:text-rust hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6M1 20v-6h6" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        {repeatingId === item._id ? "Requesting…" : "Repeat this pickup"}
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                className="btn-secondary !py-1.5 !px-3 text-xs"
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-inkSoft font-mono">{page} / {totalPages}</span>
              <button
                className="btn-secondary !py-1.5 !px-3 text-xs"
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <ChatBox
        pickupId={chatPickup?._id}
        open={!!chatPickup}
        onClose={() => setChatPickup(null)}
        otherPartyName={chatPickup?.collector?.name}
      />

      <RatingModal
        pickupId={ratePickup?._id}
        open={!!ratePickup}
        onClose={() => setRatePickup(null)}
        otherPartyName={ratePickup?.collector?.name}
        onSubmitted={() => setRatedIds((prev) => new Set(prev).add(ratePickup._id))}
      />

      <RequestDetailModal
        pickup={detailsPickup}
        open={!!detailsPickup}
        onClose={() => { setDetailsPickup(null); setOfferError(""); }}
        onChat={() => { setChatPickup(detailsPickup); setDetailsPickup(null); }}
        onRate={() => { setRatePickup(detailsPickup); setDetailsPickup(null); }}
        onReport={() => { setReportPickup(detailsPickup); setDetailsPickup(null); }}
        onCancel={async () => {
          const ok = await handleCancel(detailsPickup);
          if (ok) setDetailsPickup(null);
        }}
        cancelling={cancellingId === detailsPickup?._id}
        alreadyRated={ratedIds.has(detailsPickup?._id)}
        onRespondOffer={handleRespondOffer}
        offerSubmitting={offerSubmitting}
        offerError={offerError}
      />

      <ReportIssueModal
        pickupId={reportPickup?._id}
        open={!!reportPickup}
        onClose={() => setReportPickup(null)}
      />
    </div>
  );
}