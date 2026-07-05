import { useCallback, useEffect, useState } from "react";
import {
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
  SCRAP_TYPES,
} from "../../services/pickupService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import ChatBox from "../../components/chat/ChatBox";
import RatingModal from "../../components/rating/RatingModal";
import MapModal from "../../components/map/MapModal";
import { formatPrice } from "../../utils/formatPrice";

const NEXT_ACTION = {
  accepted: { label: "Start pickup", next: "in_progress" },
  in_progress: { label: "Mark completed", next: "completed" },
};

export default function CollectorDashboard() {
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [chatPickup, setChatPickup] = useState(null);
  const [ratePickup, setRatePickup] = useState(null);
  const [ratedIds, setRatedIds] = useState(new Set());
  const [mapPickup, setMapPickup] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, m] = await Promise.all([
        getAvailable({ limit: 20 }),
        getCollectorJobs({ limit: 20 }),
      ]);
      setAvailable(a.data.data);
      setMyJobs(m.data.data);
    } catch {
      setError("Couldn't load pickups. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // New request comes in -> add it to the available list live
  useSocket("newPickup", (pickup) => {
    setAvailable((prev) => [pickup, ...prev]);
  });

  // Any pickup updated (by this collector or another) -> reconcile both lists
  useSocket("updatePickup", (updated) => {
    setAvailable((prev) => prev.filter((p) => p._id !== updated._id));
    setMyJobs((prev) => {
      const exists = prev.some((p) => p._id === updated._id);
      return exists ? prev.map((p) => (p._id === updated._id ? updated : p)) : prev;
    });
  });

  const handleAccept = async (id) => {
    setActingId(id);
    try {
      const res = await acceptPickup(id);
      setAvailable((prev) => prev.filter((p) => p._id !== id));
      setMyJobs((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't accept this pickup — it may already be taken.");
    } finally {
      setActingId(null);
    }
  };

  const handleAdvance = async (id, next) => {
    setActingId(id);
    try {
      const res = await updateStatus(id, next);
      setMyJobs((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update the status.");
    } finally {
      setActingId(null);
    }
  };

  const activeJobs = myJobs.filter((j) => ["accepted", "in_progress"].includes(j.status));
  const pastJobs = myJobs.filter((j) => ["completed", "cancelled"].includes(j.status));

  const filteredAvailable = available
    .filter((item) => typeFilter === "all" || item.scrapType === typeFilter)
    .filter((item) => !minPrice || item.price >= Number(minPrice))
    .sort((a, b) =>
      sortBy === "price_high"
        ? b.price - a.price
        : sortBy === "price_low"
        ? a.price - b.price
        : new Date(b.createdAt) - new Date(a.createdAt)
    );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Collector dashboard</h1>
      <p className="text-sm text-inkSoft mb-6">Pick up nearby scrap and manage your jobs.</p>

      <div className="flex gap-1 mb-6 border-b border-line">
        {[
          { key: "available", label: `Available (${filteredAvailable.length})` },
          { key: "mine", label: `My jobs (${activeJobs.length})` },
          { key: "history", label: `History (${pastJobs.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-rust text-rust" : "border-transparent text-inkSoft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-5"><ErrorBox>{error}</ErrorBox></div>}

      {tab === "available" && (
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="field-input !w-auto text-sm"
          >
            <option value="all">All types</option>
            {SCRAP_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min price ₹"
            className="field-input !w-32 text-sm"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="field-input !w-auto text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="price_high">Price: high to low</option>
            <option value="price_low">Price: low to high</option>
          </select>

          {(typeFilter !== "all" || minPrice) && (
            <button
              onClick={() => { setTypeFilter("all"); setMinPrice(""); }}
              className="text-xs font-semibold text-rust hover:underline self-center"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <CardSkeleton count={3} withImage />
      ) : (
        <div className="space-y-3">
          {tab === "available" && (
            filteredAvailable.length === 0 ? (
              <Card className="p-10 text-center text-inkSoft">
                {available.length === 0
                  ? "No pickups available right now — check back soon."
                  : "No pickups match your filters."}
              </Card>
            ) : (
              filteredAvailable.map((item) => (
                <Card key={item._id} className="p-5 pt-6 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.scrapType}
                        className="w-16 h-16 rounded-md object-cover shrink-0 border border-line"
                      />
                    )}
                    <div>
                      <div className="font-display font-semibold text-ink capitalize">
                        {item.scrapType}{item.estimatedWeightKg ? ` · ${item.estimatedWeightKg}kg` : ""}
                      </div>
                      <div className="text-xs text-inkFaint mt-0.5 flex items-center gap-1.5">
                        <span>{item.location?.address || `${item.location.lat.toFixed(3)}, ${item.location.lng.toFixed(3)}`}</span>
                        <button
                          onClick={() => setMapPickup(item)}
                          className="text-rust font-semibold hover:underline"
                        >
                          View map
                        </button>
                      </div>
                      {item.user?.name && <div className="text-xs text-inkSoft mt-1">Requested by {item.user.name}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-ink">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => handleAccept(item._id)}
                      disabled={actingId === item._id}
                      className="btn-primary !py-2 !px-4 text-sm"
                    >
                      {actingId === item._id ? "Accepting…" : "Accept"}
                    </button>
                  </div>
                </Card>
              ))
            )
          )}

          {tab === "mine" && (
            activeJobs.length === 0 ? (
              <Card className="p-10 text-center text-inkSoft">No active jobs — accept a pickup to get started.</Card>
            ) : (
              activeJobs.map((item) => {
                const action = NEXT_ACTION[item.status];
                return (
                  <Card key={item._id} className="p-5 pt-6 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.scrapType}
                          className="w-16 h-16 rounded-md object-cover shrink-0 border border-line"
                        />
                      )}
                      <div>
                        <div className="font-display font-semibold text-ink capitalize">{item.scrapType}</div>
                        {item.user?.name && <div className="text-xs text-inkSoft mt-1">For {item.user.name}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusStamp status={item.status} />
                      <button
                        onClick={() => setChatPickup(item)}
                        className="text-xs font-semibold text-rust hover:underline flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        Chat
                      </button>
                      {action && (
                        <button
                          onClick={() => handleAdvance(item._id, action.next)}
                          disabled={actingId === item._id}
                          className="btn-primary !py-2 !px-4 text-sm"
                        >
                          {actingId === item._id ? "Updating…" : action.label}
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })
            )
          )}

          {tab === "history" && (
            pastJobs.length === 0 ? (
              <Card className="p-10 text-center text-inkSoft">No completed jobs yet.</Card>
            ) : (
              pastJobs.map((item) => (
                <Card key={item._id} className="p-4 pt-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.scrapType}
                        className="w-12 h-12 rounded-md object-cover shrink-0 border border-line"
                      />
                    )}
                    <div className="font-medium text-ink capitalize self-center">{item.scrapType}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-ink">{formatPrice(item.price)}</span>
                    <StatusStamp status={item.status} />
                    {item.status === "completed" && item.user && !ratedIds.has(item._id) && (
                      <button
                        onClick={() => setRatePickup(item)}
                        className="text-xs font-semibold text-amber-dark hover:underline flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Rate requester
                      </button>
                    )}
                  </div>
                </Card>
              ))
            )
          )}
        </div>
      )}

      <ChatBox
        pickupId={chatPickup?._id}
        open={!!chatPickup}
        onClose={() => setChatPickup(null)}
        otherPartyName={chatPickup?.user?.name}
      />

      <RatingModal
        pickupId={ratePickup?._id}
        open={!!ratePickup}
        onClose={() => setRatePickup(null)}
        otherPartyName={ratePickup?.user?.name}
        onSubmitted={() => setRatedIds((prev) => new Set(prev).add(ratePickup._id))}
      />

      <MapModal
        open={!!mapPickup}
        onClose={() => setMapPickup(null)}
        lat={mapPickup?.location?.lat}
        lng={mapPickup?.location?.lng}
        address={mapPickup?.location?.address}
        label={mapPickup?.scrapType}
      />
    </div>
  );
}