import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyRequests, cancelPickup, exportMyRequests } from "../../services/pickupService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import ChatBox from "../../components/chat/ChatBox";
import RatingModal from "../../components/rating/RatingModal";
import RequestDetailModal from "../../components/pickup/RequestDetailModal";
import { formatPrice } from "../../utils/formatPrice";
import { downloadBlob } from "../../utils/downloadBlob";
import useDocumentMeta from "../../hooks/useDocumentMeta";

const TYPE_LABELS = {
  metal: "Metal",
  plastic: "Plastic",
  paper: "Paper",
  "e-waste": "E-waste",
  glass: "Glass",
  other: "Other",
};

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

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatPickup, setChatPickup] = useState(null);
  const [ratePickup, setRatePickup] = useState(null);
  const [ratedIds, setRatedIds] = useState(new Set());
  const [cancellingId, setCancellingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [detailsPickup, setDetailsPickup] = useState(null);

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
                      <img src={item.image} alt={item.scrapType} className="w-16 h-16 rounded-md object-cover shrink-0 border border-line" />
                    )}
                    <div>
                      <div className="font-display font-semibold text-ink">
                        {TYPE_LABELS[item.scrapType] || item.scrapType}
                        {item.estimatedWeightKg ? ` · ${item.estimatedWeightKg}kg` : ""}
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
        onClose={() => setDetailsPickup(null)}
        onChat={() => { setChatPickup(detailsPickup); setDetailsPickup(null); }}
        onRate={() => { setRatePickup(detailsPickup); setDetailsPickup(null); }}
        onCancel={async () => {
          const ok = await handleCancel(detailsPickup);
          if (ok) setDetailsPickup(null);
        }}
        cancelling={cancellingId === detailsPickup?._id}
        alreadyRated={ratedIds.has(detailsPickup?._id)}
      />
    </div>
  );
}