import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getMyRequests } from "../../services/pickupService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import Loader from "../../components/common/Loader";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import { formatPrice } from "../../utils/formatPrice";

const TYPE_LABELS = {
  metal: "Metal",
  plastic: "Plastic",
  paper: "Paper",
  "e-waste": "E-waste",
  glass: "Glass",
  other: "Other",
};

export default function MyRequests() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">My requests</h1>
          <p className="text-sm text-inkSoft mt-0.5">Every pickup you've scheduled, tracked here.</p>
        </div>
        <Link to="/request" className="btn-primary">+ New request</Link>
      </div>

      {error && <div className="mb-5"><ErrorBox>{error}</ErrorBox></div>}

      {loading ? (
        <Loader label="Loading your requests…" />
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-inkSoft mb-4">You haven't requested a pickup yet.</p>
          <Link to="/request" className="btn-primary inline-flex">Request your first pickup</Link>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item._id} className="p-5 pt-6 flex items-start justify-between gap-4 flex-wrap">
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
                </div>
              </Card>
            ))}
          </div>

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
    </div>
  );
}