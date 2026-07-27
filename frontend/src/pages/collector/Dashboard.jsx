import { useCallback, useEffect, useState } from "react";
import {
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
  SCRAP_TYPES,
} from "../../services/pickupService";
import { getWalletSummary, getTransactions } from "../../services/walletService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import ChatBox from "../../components/chat/ChatBox";
import RatingModal from "../../components/rating/RatingModal";
import MapModal from "../../components/map/MapModal";
import { formatPrice } from "../../utils/formatPrice";
import { distanceKm, formatDistance } from "../../utils/distance";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import useGeolocation from "../../hooks/useGeolocation";

const NEXT_ACTION = {
  accepted: { label: "Start pickup", next: "in_progress" },
  in_progress: { label: "Mark completed", next: "completed" },
};

export default function CollectorDashboard() {
  useDocumentMeta({ title: "Collector Dashboard", noindex: true });
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
  const [wallet, setWallet] = useState(null);
  const [walletTx, setWalletTx] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const { coords: myCoords, status: locStatus, error: locError, locate: locateMe } = useGeolocation();

  // Ask for location as soon as the dashboard loads — collectors are the
  // side of the marketplace this actually matters for, and the UI already
  // has a graceful fallback (locStatus === "error") if they decline.
  useEffect(() => { locateMe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // With real coordinates, the backend does an actual $geoNear query —
      // pickups within radiusKm, sorted by real distance, not just "whatever
      // happened to be in the newest 20 nationally." Without coordinates
      // (denied/unsupported), falls back to the original newest-first list.
      const availableParams = myCoords
        ? { limit: 50, lat: myCoords.lat, lng: myCoords.lng, radiusKm: 50 }
        : { limit: 20 };

      const [a, m] = await Promise.all([
        getAvailable(availableParams),
        getCollectorJobs({ limit: 20 }),
      ]);
      setAvailable(a.data.data);
      setMyJobs(m.data.data);
    } catch {
      setError("Couldn't load pickups. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [myCoords]);

  useEffect(() => { load(); }, [load]);

  // Loaded on demand, not with the rest of the dashboard — a collector who
  // never opens this tab shouldn't pay for the extra request every visit.
  useEffect(() => {
    if (tab !== "wallet" || wallet) return;
    setWalletLoading(true);
    Promise.all([getWalletSummary(), getTransactions({ limit: 20 })])
      .then(([summaryRes, txRes]) => {
        setWallet(summaryRes.data);
        setWalletTx(txRes.data.data);
      })
      .catch(() => setError("Couldn't load your wallet."))
      .finally(() => setWalletLoading(false));
  }, [tab, wallet]);

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
      if (next === "completed") setWallet(null); // refetch next time the wallet tab is opened
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
    .sort((a, b) => {
      if (sortBy === "distance") {
        const distA = a.distanceKm ?? (myCoords ? distanceKm(myCoords.lat, myCoords.lng, a.location.lat, a.location.lng) : Infinity);
        const distB = b.distanceKm ?? (myCoords ? distanceKm(myCoords.lat, myCoords.lng, b.location.lat, b.location.lng) : Infinity);
        return distA - distB;
      }
      if (sortBy === "price_high") return b.price - a.price;
      if (sortBy === "price_low") return a.price - b.price;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Collector dashboard</h1>
      <p className="text-sm text-inkSoft mb-6">Pick up nearby scrap and manage your jobs.</p>

      <div className="flex gap-1 mb-6 border-b border-line">
        {[
          { key: "available", label: `Available (${filteredAvailable.length})` },
          { key: "mine", label: `My jobs (${activeJobs.length})` },
          { key: "history", label: `History (${pastJobs.length})` },
          { key: "wallet", label: "Wallet" },
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
            onChange={(e) => {
              setSortBy(e.target.value);
              if (e.target.value === "distance" && !myCoords) locateMe();
            }}
            className="field-input !w-auto text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="price_high">Price: high to low</option>
            <option value="price_low">Price: low to high</option>
            <option value="distance">Nearest first</option>
          </select>

          {sortBy === "distance" && !myCoords && (
            <span className="text-xs text-inkFaint self-center flex items-center gap-1.5">
              {locStatus === "locating" ? (
                "Finding your location…"
              ) : locStatus === "error" ? (
                <span className="text-danger">{locError}</span>
              ) : (
                <>
                  Need your location to sort by distance.
                  <button onClick={locateMe} className="text-rust font-semibold hover:underline">
                    Enable
                  </button>
                </>
              )}
            </span>
          )}

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
                      <div className="text-xs text-inkFaint mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {(item.distanceKm !== undefined || myCoords) && (
                          <span className="font-mono font-semibold text-amber-dark">
                            {formatDistance(item.distanceKm ?? distanceKm(myCoords.lat, myCoords.lng, item.location.lat, item.location.lng))} away
                          </span>
                        )}
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

          {tab === "wallet" && (
            walletLoading ? (
              <CardSkeleton count={2} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Card className="p-5">
                    <div className="text-xs text-inkFaint mb-1">Total earned</div>
                    <div className="font-display text-xl font-bold text-ink">
                      {formatPrice(wallet?.allTime.totalEarned)}
                    </div>
                    <div className="text-xs text-inkSoft mt-1">
                      {wallet?.allTime.pickupsCompleted || 0} pickups completed
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="text-xs text-inkFaint mb-1">Last 7 days</div>
                    <div className="font-display text-xl font-bold text-ink">
                      {formatPrice(wallet?.last7Days.totalEarned)}
                    </div>
                    <div className="text-xs text-inkSoft mt-1">
                      {wallet?.last7Days.pickupsCompleted || 0} pickups
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="text-xs text-inkFaint mb-1">Last 30 days</div>
                    <div className="font-display text-xl font-bold text-ink">
                      {formatPrice(wallet?.last30Days.totalEarned)}
                    </div>
                    <div className="text-xs text-inkSoft mt-1">
                      {wallet?.last30Days.pickupsCompleted || 0} pickups
                    </div>
                  </Card>
                </div>

                {walletTx.length === 0 ? (
                  <Card className="p-10 text-center text-inkSoft">
                    No earnings yet — complete a pickup to start building your history.
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {walletTx.map((tx) => (
                      <Card key={tx._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="font-medium text-ink capitalize">
                            {tx.pickup?.scrapType || "Pickup"}
                            {tx.pickup?.estimatedWeightKg ? ` · ${tx.pickup.estimatedWeightKg}kg` : ""}
                          </div>
                          <div className="text-xs text-inkFaint mt-0.5">
                            {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <span className="font-mono font-semibold text-rust">
                          +{formatPrice(tx.amount)}
                        </span>
                      </Card>
                    ))}
                  </div>
                )}
              </>
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