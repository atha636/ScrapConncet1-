import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
  SCRAP_TYPES,
} from "../../services/pickupService";
import { getWalletSummary, getTransactions, requestPayout, getMyPayouts } from "../../services/walletService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import ChatBox from "../../components/chat/ChatBox";
import RatingModal from "../../components/rating/RatingModal";
import MapModal from "../../components/map/MapModal";
import PickupDetailModal from "../../components/pickup/PickupDetailModal";
import { formatPrice } from "../../utils/formatPrice";
import { distanceKm, formatDistance } from "../../utils/distance";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import useGeolocation from "../../hooks/useGeolocation";
import { useAuth } from "../../context/AuthContext";

const NEXT_ACTION = {
  accepted: { label: "Start pickup", next: "in_progress" },
  in_progress: { label: "Mark completed", next: "completed" },
};

const TABS = [
  { key: "available", label: "Available" },
  { key: "mine", label: "My jobs" },
  { key: "history", label: "History" },
  { key: "wallet", label: "Wallet" },
];

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// Small dashed-circle icon for empty states — echoes the .stamp dashed
// border already used for status badges, rather than a random stock icon.
function EmptyIcon({ children }) {
  return (
    <div className="w-11 h-11 mx-auto mb-3 rounded-full border-2 border-dashed border-line flex items-center justify-center text-inkFaint">
      {children}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5h-4a2 2 0 000 4h4" />
    </svg>
  );
}

export default function CollectorDashboard() {
  useDocumentMeta({ title: "Collector Dashboard", noindex: true });
  const { user } = useAuth();
  const isSuspended = !!user?.collectorSuspended;
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
  const [detailsPickup, setDetailsPickup] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [wallet, setWallet] = useState(null);
  const [walletTx, setWalletTx] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [myPayouts, setMyPayouts] = useState([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState("");
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
    Promise.all([getWalletSummary(), getTransactions({ limit: 20 }), getMyPayouts()])
      .then(([summaryRes, txRes, payoutsRes]) => {
        setWallet(summaryRes.data);
        setWalletTx(txRes.data.data);
        setMyPayouts(payoutsRes.data);
      })
      .catch(() => setError("Couldn't load your wallet."))
      .finally(() => setWalletLoading(false));
  }, [tab, wallet]);

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setPayoutError("");
    setPayoutSubmitting(true);
    try {
      const res = await requestPayout(Number(payoutAmount));
      setMyPayouts((prev) => [res.data, ...prev]);
      setWallet(null); // refetch — available balance now has this reserved
      setPayoutAmount("");
    } catch (err) {
      setPayoutError(err.response?.data?.message || "Couldn't submit that request.");
    } finally {
      setPayoutSubmitting(false);
    }
  };

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
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't accept this pickup — it may already be taken.");
      return false;
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
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;

      if (sortBy === "distance") {
        const distA = a.distanceKm ?? (myCoords ? distanceKm(myCoords.lat, myCoords.lng, a.location.lat, a.location.lng) : Infinity);
        const distB = b.distanceKm ?? (myCoords ? distanceKm(myCoords.lat, myCoords.lng, b.location.lat, b.location.lng) : Infinity);
        return distA - distB;
      }
      if (sortBy === "price_high") return b.price - a.price;
      if (sortBy === "price_low") return a.price - b.price;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const counts = { available: filteredAvailable.length, mine: activeJobs.length, history: pastJobs.length };

  return (
    <MotionConfig reducedMotion="user">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Collector dashboard</h1>
        <p className="text-sm text-inkSoft mb-6">Pick up nearby scrap and manage your jobs.</p>

        {isSuspended && (
          <div className="mb-5">
            <ErrorBox>
              Your account is suspended from accepting new pickups due to low ratings.
              Contact support if you think this is a mistake.
            </ErrorBox>
          </div>
        )}

        {/* Tabs, with a sliding underline instead of a per-button static border —
            the indicator itself animates between positions via layoutId. */}
        <div className="flex gap-1 mb-6 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2.5 text-sm font-medium -mb-px transition-colors ${
                tab === t.key ? "text-rust" : "text-inkSoft hover:text-ink"
              }`}
            >
              {t.label}{t.key !== "wallet" ? ` (${counts[t.key]})` : ""}
              {tab === t.key && (
                <motion.span
                  layoutId="collector-tab-underline"
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-rust"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
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
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {tab === "available" && (
                filteredAvailable.length === 0 ? (
                  <Card className="p-10 text-center text-inkSoft">
                    <EmptyIcon>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                      </svg>
                    </EmptyIcon>
                    {available.length === 0
                      ? "No pickups available right now — check back soon."
                      : "No pickups match your filters."}
                  </Card>
                ) : (
                  <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3">
                    {filteredAvailable.map((item) => (
                      <motion.div key={item._id} variants={listItem} layout>
                        <Card
                          onClick={() => setDetailsPickup(item)}
                          className="p-5 pt-6 flex items-center justify-between gap-4 flex-wrap cursor-pointer transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,18,0.08)]"
                        >
                          <div className="flex gap-4">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.scrapType}
                                className="w-16 h-16 rounded-md object-cover shrink-0 border border-line"
                              />
                            )}
                            <div>
                              <div className="font-display font-semibold text-ink capitalize flex items-center gap-2">
                                {item.scrapType}{item.estimatedWeightKg ? ` · ${item.estimatedWeightKg}kg` : ""}
                                {item.isUrgent && (
                                  <motion.span
                                    animate={{ opacity: [1, 0.55, 1] }}
                                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-[10px] uppercase tracking-wide font-bold bg-danger text-surface px-1.5 py-0.5 rounded-ticket"
                                  >
                                    Urgent
                                  </motion.span>
                                )}
                              </div>
                              <div className="text-xs text-inkFaint mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {(item.distanceKm !== undefined || myCoords) && (
                                  <span className="font-mono font-semibold text-amber-dark">
                                    {formatDistance(item.distanceKm ?? distanceKm(myCoords.lat, myCoords.lng, item.location.lat, item.location.lng))} away
                                  </span>
                                )}
                                <span>{item.location?.address || `${item.location.lat.toFixed(3)}, ${item.location.lng.toFixed(3)}`}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMapPickup(item); }}
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
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={(e) => { e.stopPropagation(); handleAccept(item._id); }}
                              disabled={actingId === item._id || isSuspended}
                              title={isSuspended ? "Your account can't accept new pickups right now" : undefined}
                              className="btn-primary !py-2 !px-4 text-sm"
                            >
                              {actingId === item._id ? "Accepting…" : "Accept"}
                            </motion.button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )
              )}

              {tab === "mine" && (
                activeJobs.length === 0 ? (
                  <Card className="p-10 text-center text-inkSoft">
                    <EmptyIcon>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </EmptyIcon>
                    No active jobs — accept a pickup to get started.
                  </Card>
                ) : (
                  <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3">
                    {activeJobs.map((item) => {
                      const action = NEXT_ACTION[item.status];
                      return (
                        <motion.div key={item._id} variants={listItem} layout>
                          <Card className="p-5 pt-6 flex items-center justify-between gap-4 flex-wrap">
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
                                <motion.button
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => handleAdvance(item._id, action.next)}
                                  disabled={actingId === item._id}
                                  className="btn-primary !py-2 !px-4 text-sm"
                                >
                                  {actingId === item._id ? "Updating…" : action.label}
                                </motion.button>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )
              )}

              {tab === "history" && (
                pastJobs.length === 0 ? (
                  <Card className="p-10 text-center text-inkSoft">
                    <EmptyIcon>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" />
                      </svg>
                    </EmptyIcon>
                    No completed jobs yet.
                  </Card>
                ) : (
                  <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3">
                    {pastJobs.map((item) => (
                      <motion.div key={item._id} variants={listItem}>
                        <Card className="p-4 pt-5 flex items-center justify-between gap-4 flex-wrap">
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
                      </motion.div>
                    ))}
                  </motion.div>
                )
              )}

              {tab === "wallet" && (
                walletLoading ? (
                  <CardSkeleton count={2} />
                ) : (
                  <>
                    <motion.div
                      variants={listStagger}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4"
                    >
                      <motion.div variants={listItem}>
                        <Card className="p-5 border-rust/30">
                          <div className="flex items-center gap-2 text-inkFaint mb-2">
                            <WalletIcon />
                            <span className="text-xs">Available to withdraw</span>
                          </div>
                          <div className="font-display text-xl font-bold text-rust">
                            {formatPrice(wallet?.balance?.available)}
                          </div>
                          {wallet?.balance?.totalPending > 0 && (
                            <div className="text-xs text-amber-dark mt-1">
                              {formatPrice(wallet.balance.totalPending)} pending review
                            </div>
                          )}
                        </Card>
                      </motion.div>

                      {[
                        { label: "Total earned", data: wallet?.allTime },
                        { label: "Last 7 days", data: wallet?.last7Days },
                        { label: "Last 30 days", data: wallet?.last30Days },
                      ].map((card) => (
                        <motion.div key={card.label} variants={listItem}>
                          <Card className="p-5">
                            <div className="flex items-center gap-2 text-inkFaint mb-2">
                              <WalletIcon />
                              <span className="text-xs">{card.label}</span>
                            </div>
                            <div className="font-display text-xl font-bold text-ink">
                              {formatPrice(card.data?.totalEarned)}
                            </div>
                            <div className="text-xs text-inkSoft mt-1">
                              {card.data?.pickupsCompleted || 0} pickups{card.label === "Total earned" ? " completed" : ""}
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Request payout */}
                    <Card className="p-5 mb-6">
                      <h3 className="font-display font-semibold text-ink text-sm mb-3">Request a payout</h3>
                      {payoutError && <div className="mb-3"><ErrorBox>{payoutError}</ErrorBox></div>}
                      <form onSubmit={handleRequestPayout} className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[160px]">
                          <label className="field-label">Amount (₹)</label>
                          <input
                            type="number"
                            min="1"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            placeholder={`Min. ${formatPrice(100).replace("₹", "")}`}
                            className="field-input"
                          />
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          type="submit"
                          disabled={payoutSubmitting || !payoutAmount || myPayouts.some((p) => p.status === "pending")}
                          className="btn-primary !py-2.5"
                        >
                          {payoutSubmitting ? "Submitting…" : "Request payout"}
                        </motion.button>
                      </form>
                      {myPayouts.some((p) => p.status === "pending") && (
                        <p className="text-xs text-inkFaint mt-2">
                          You already have a payout request pending review.
                        </p>
                      )}
                    </Card>

                    {myPayouts.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-display font-semibold text-ink text-sm mb-3">Payout history</h3>
                        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-2">
                          {myPayouts.map((p) => (
                            <motion.div key={p._id} variants={listItem}>
                              <Card className="p-4 flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                  <div className="font-mono font-semibold text-ink">{formatPrice(p.amount)}</div>
                                  <div className="text-xs text-inkFaint mt-0.5">
                                    {new Date(p.createdAt).toLocaleDateString("en-IN", {
                                      day: "numeric", month: "short", year: "numeric",
                                    })}
                                  </div>
                                </div>
                                <span
                                  className={`stamp ${
                                    p.status === "approved"
                                      ? "stamp-completed"
                                      : p.status === "rejected"
                                      ? "stamp-cancelled"
                                      : "stamp-pending"
                                  }`}
                                >
                                  {p.status === "approved" ? "Paid out" : p.status === "rejected" ? "Rejected" : "Pending review"}
                                </span>
                              </Card>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    )}

                    {walletTx.length === 0 ? (
                      <Card className="p-10 text-center text-inkSoft">
                        <EmptyIcon><WalletIcon /></EmptyIcon>
                        No earnings yet — complete a pickup to start building your history.
                      </Card>
                    ) : (
                      <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-2">
                        {walletTx.map((tx) => (
                          <motion.div key={tx._id} variants={listItem}>
                            <Card className="p-4 flex items-center justify-between gap-4 flex-wrap">
                              <div>
                                <div className="font-medium text-ink capitalize">
                                  {tx.type === "payout"
                                    ? "Payout"
                                    : `${tx.pickup?.scrapType || "Pickup"}${tx.pickup?.estimatedWeightKg ? ` · ${tx.pickup.estimatedWeightKg}kg` : ""}`}
                                </div>
                                <div className="text-xs text-inkFaint mt-0.5">
                                  {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              </div>
                              <span className={`font-mono font-semibold ${tx.type === "payout" ? "text-inkSoft" : "text-rust"}`}>
                                {tx.type === "payout" ? "−" : "+"}{formatPrice(tx.amount)}
                              </span>
                            </Card>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </>
                )
              )}
            </motion.div>
          </AnimatePresence>
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

        <PickupDetailModal
          pickup={detailsPickup}
          open={!!detailsPickup}
          onClose={() => setDetailsPickup(null)}
          onViewMap={() => { setMapPickup(detailsPickup); setDetailsPickup(null); }}
          onAccept={async () => {
            const ok = await handleAccept(detailsPickup._id);
            if (ok) setDetailsPickup(null);
          }}
          accepting={actingId === detailsPickup?._id}
          isSuspended={isSuspended}
        />
      </div>
    </MotionConfig>
  );
}