import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getAdminStats,
  getAdminAnalytics,
  getAdminUsers,
  deactivateUser,
  activateUser,
  reinstateCollector,
  getPayoutRequests,
  approvePayout,
  rejectPayout,
  getAllPickups,
  getDisputes,
  resolveDispute,
  exportUsersCsv,
  exportPickupsCsv,
} from "../services/adminService";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import CardSkeleton from "../components/common/CardSkeleton";
import ErrorBox from "../components/common/ErrorBox";
import StatusStamp from "../components/ui/StatusStamp";
import AdminCharts from "../components/admin/AdminCharts";
import { formatPrice } from "../utils/formatPrice";
import { downloadBlob } from "../utils/downloadBlob";
import useDocumentMeta from "../hooks/useDocumentMeta";
import useCountUp from "../hooks/useCountUp";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "analytics", label: "Analytics" },
  { key: "users", label: "Users" },
  { key: "payouts", label: "Payouts" },
  { key: "disputes", label: "Disputes" },
  { key: "pickups", label: "All pickups" },
];

// Mirrors ReportIssueModal's own mapping so the reason reads the same way
// wherever it's shown — the person who filed it and the admin reviewing it
// should see identical wording, not two different phrasings of the same enum.
const DISPUTE_REASON_LABELS = {
  no_show: "Never showed up",
  wrong_weight_or_price: "Weight or price disagreement",
  damaged_property: "Property damaged",
  unsafe_or_rude_behavior: "Unsafe or rude behavior",
  payment_issue: "Payment issue",
  other: "Other",
};

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// Ticks up on load — same easing as the dashboard stat cards and the
// homepage receipt hero, so numbers arriving across the app read as one
// consistent language rather than three different implementations.
function StatValue({ value, isMoney }) {
  const numeric = isMoney ? Number(String(value).replace(/[^\d.-]/g, "")) : value;
  const animated = useCountUp(numeric || 0, true, 600);
  return <>{isMoney ? formatPrice(animated) : animated}</>;
}

export default function AdminPanel() {
  useDocumentMeta({ title: "Admin Panel", noindex: true });
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutFilter, setPayoutFilter] = useState("pending");
  const [disputes, setDisputes] = useState([]);
  const [disputeFilter, setDisputeFilter] = useState("open");
  const [resolvingNote, setResolvingNote] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportingPickups, setExportingPickups] = useState(false);

  const loadOverview = useCallback(async () => {
    const res = await getAdminStats();
    setStats(res.data);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const [statsRes, analyticsRes] = await Promise.all([getAdminStats(), getAdminAnalytics()]);
    setStats(statsRes.data);
    setSeries(analyticsRes.data.series);
  }, []);

  const loadUsers = useCallback(async (search = "") => {
    const res = await getAdminUsers({ limit: 30, search: search || undefined });
    setUsers(res.data.data);
  }, []);

  const loadPayouts = useCallback(async (status = payoutFilter) => {
    const res = await getPayoutRequests({ limit: 30, status: status || undefined });
    setPayouts(res.data.data);
  }, [payoutFilter]);

  const loadDisputes = useCallback(async (status = disputeFilter) => {
    const res = await getDisputes({ limit: 30, status: status || undefined });
    setDisputes(res.data.data);
  }, [disputeFilter]);

  const loadPickups = useCallback(async () => {
    const res = await getAllPickups({ limit: 30 });
    setPickups(res.data.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const load =
      tab === "overview"
        ? loadOverview
        : tab === "analytics"
        ? loadAnalytics
        : tab === "users"
        ? () => loadUsers()
        : tab === "payouts"
        ? () => loadPayouts()
        : tab === "disputes"
        ? () => loadDisputes()
        : loadPickups;
    load()
      .catch(() => setError("Couldn't load this section. Try refreshing."))
      .finally(() => setLoading(false));
  }, [tab, loadOverview, loadAnalytics, loadUsers, loadPayouts, loadDisputes, loadPickups]);

  const handleToggleActive = async (u) => {
    setActingId(u._id);
    try {
      const res = u.isActive ? await deactivateUser(u._id) : await activateUser(u._id);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.data : x)));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update this user.");
    } finally {
      setActingId(null);
    }
  };

  const handleReinstate = async (u) => {
    setActingId(u._id);
    try {
      const res = await reinstateCollector(u._id);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.data : x)));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reinstate this collector.");
    } finally {
      setActingId(null);
    }
  };

  const handleApprovePayout = async (p) => {
    setActingId(p._id);
    setError("");
    try {
      const res = await approvePayout(p._id);
      setPayouts((prev) => (payoutFilter ? prev.filter((x) => x._id !== p._id) : prev.map((x) => (x._id === p._id ? res.data : x))));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't approve this payout.");
    } finally {
      setActingId(null);
    }
  };

  const handleRejectPayout = async (p) => {
    if (!window.confirm(`Reject the ₹${p.amount} payout request from ${p.collector?.name}?`)) return;
    setActingId(p._id);
    setError("");
    try {
      const res = await rejectPayout(p._id);
      setPayouts((prev) => (payoutFilter ? prev.filter((x) => x._id !== p._id) : prev.map((x) => (x._id === p._id ? res.data : x))));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reject this payout.");
    } finally {
      setActingId(null);
    }
  };

  const handleResolveDispute = async (d, status) => {
    setActingId(d._id);
    setError("");
    try {
      const res = await resolveDispute(d._id, { status, resolutionNotes: resolvingNote[d._id] });
      setDisputes((prev) =>
        disputeFilter ? prev.filter((x) => x._id !== d._id) : prev.map((x) => (x._id === d._id ? res.data : x))
      );
      setResolvingNote((prev) => {
        const next = { ...prev };
        delete next[d._id];
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update this dispute.");
    } finally {
      setActingId(null);
    }
  };

  // BUG FIX: this previously called loadUsers(userSearch) directly with no
  // loading state and no error handling — a failed search request just
  // silently did nothing (an unhandled promise rejection), leaving stale
  // results on screen with zero feedback that anything went wrong.
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setError("");
    try {
      await loadUsers(userSearch);
    } catch {
      setError("Couldn't search users. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleExportUsers = async () => {
    setExportingUsers(true);
    setError("");
    try {
      const res = await exportUsersCsv();
      downloadBlob(res.data, `scrapconnect-users-${Date.now()}.csv`);
    } catch {
      setError("Couldn't export users. Try again.");
    } finally {
      setExportingUsers(false);
    }
  };

  const handleExportPickups = async () => {
    setExportingPickups(true);
    setError("");
    try {
      const res = await exportPickupsCsv();
      downloadBlob(res.data, `scrapconnect-pickups-${Date.now()}.csv`);
    } catch {
      setError("Couldn't export pickups. Try again.");
    } finally {
      setExportingPickups(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Admin panel</h1>
      <p className="text-sm text-inkSoft mb-6">Platform-wide oversight — users, pickups, and stats.</p>

      <div className="flex gap-1 mb-6 border-b border-line overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium -mb-px transition-colors shrink-0 whitespace-nowrap ${
              tab === t.key ? "text-rust" : "text-inkSoft hover:text-ink"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <motion.span
                layoutId="admin-tab-underline"
                className="absolute left-0 right-0 -bottom-px h-[2px] bg-rust"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <ErrorBox>{error}</ErrorBox>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        tab === "overview" || tab === "analytics" ? <Loader /> : <CardSkeleton count={4} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "overview" && stats && (
              <motion.div
                variants={listStagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                {[
                  { label: "Requesters", value: stats.totalUsers },
                  { label: "Collectors", value: stats.totalCollectors },
                  { label: "Total pickups", value: stats.totalPickups },
                  { label: "Pending", value: stats.pendingCount },
                  { label: "In progress", value: stats.activeCount },
                  { label: "Completed", value: stats.completedCount },
                  { label: "Cancelled", value: stats.cancelledCount },
                  { label: "Value moved", value: stats.totalValueMoved, isMoney: true },
                ].map((s) => (
                  <motion.div key={s.label} variants={listItem}>
                    <Card className="p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,18,0.08)]">
                      <div className="text-xs text-inkFaint uppercase tracking-wide font-mono mb-1">{s.label}</div>
                      <div className="font-display text-xl font-bold text-ink">
                        <StatValue value={s.value} isMoney={s.isMoney} />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {tab === "analytics" && <AdminCharts series={series} stats={stats} />}

            {tab === "users" && (
              <div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="field-input"
                    />
                    <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={searching} className="btn-secondary shrink-0">
                      {searching ? "Searching…" : "Search"}
                    </motion.button>
                  </form>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={handleExportUsers} disabled={exportingUsers} className="btn-secondary shrink-0">
                    {exportingUsers ? "Exporting…" : "Export CSV"}
                  </motion.button>
                </div>

                {searching ? (
                  <CardSkeleton count={3} />
                ) : (
                  <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-2">
                    {users.length === 0 ? (
                      <Card className="p-10 text-center text-inkSoft">No users match your search.</Card>
                    ) : (
                      users.map((u) => (
                        <motion.div key={u._id} variants={listItem} layout>
                          <Card className="p-4 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <div className="font-medium text-ink">
                                {u.name} <span className="text-xs text-inkFaint font-mono capitalize">· {u.role}</span>
                                {u.collectorSuspended && (
                                  <span className="ml-2 text-xs font-mono font-semibold text-danger">Rating-suspended</span>
                                )}
                              </div>
                              <div className="text-xs text-inkSoft">{u.email}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-mono font-semibold ${u.isActive ? "text-amber-dark" : "text-danger"}`}>
                                {u.isActive ? "Active" : "Deactivated"}
                              </span>
                              {u.collectorSuspended && (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleReinstate(u)}
                                  disabled={actingId === u._id}
                                  className="btn-primary !py-1.5 !px-3 text-xs"
                                >
                                  {actingId === u._id ? "…" : "Reinstate"}
                                </motion.button>
                              )}
                              {u.role !== "admin" && (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleToggleActive(u)}
                                  disabled={actingId === u._id}
                                  className={u.isActive ? "btn-secondary !py-1.5 !px-3 text-xs" : "btn-primary !py-1.5 !px-3 text-xs"}
                                >
                                  {actingId === u._id ? "…" : u.isActive ? "Deactivate" : "Activate"}
                                </motion.button>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {tab === "payouts" && (
              <div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <select
                    value={payoutFilter}
                    onChange={(e) => setPayoutFilter(e.target.value)}
                    className="field-input !w-auto text-sm"
                  >
                    <option value="pending">Pending review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="">All</option>
                  </select>
                </div>

                <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-2">
                  {payouts.length === 0 ? (
                    <Card className="p-10 text-center text-inkSoft">No payout requests here.</Card>
                  ) : (
                    payouts.map((p) => (
                      <motion.div key={p._id} variants={listItem} layout>
                        <Card className="p-4 flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <div className="font-mono font-semibold text-ink text-base">{formatPrice(p.amount)}</div>
                            <div className="text-xs text-inkSoft mt-0.5">
                              {p.collector?.name} <span className="text-inkFaint">· {p.collector?.email}</span>
                            </div>
                            <div className="text-xs text-inkFaint mt-0.5 font-mono">
                              Requested {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {p.processedBy?.name && ` · ${p.status} by ${p.processedBy.name}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`stamp ${
                                p.status === "approved" ? "stamp-completed" : p.status === "rejected" ? "stamp-cancelled" : "stamp-pending"
                              }`}
                            >
                              {p.status === "approved" ? "Paid out" : p.status === "rejected" ? "Rejected" : "Pending review"}
                            </span>
                            {p.status === "pending" && (
                              <>
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRejectPayout(p)}
                                  disabled={actingId === p._id}
                                  className="text-xs font-semibold text-danger hover:underline"
                                >
                                  Reject
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleApprovePayout(p)}
                                  disabled={actingId === p._id}
                                  className="btn-primary !py-1.5 !px-3 text-xs"
                                >
                                  {actingId === p._id ? "…" : "Approve"}
                                </motion.button>
                              </>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </div>
            )}

            {tab === "disputes" && (
              <div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <select
                    value={disputeFilter}
                    onChange={(e) => {
                      setDisputeFilter(e.target.value);
                      loadDisputes(e.target.value);
                    }}
                    className="field-input !w-auto text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="">All</option>
                  </select>
                </div>

                <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-2">
                  {disputes.length === 0 ? (
                    <Card className="p-10 text-center text-inkSoft">No disputes here.</Card>
                  ) : (
                    disputes.map((d) => (
                      <motion.div key={d._id} variants={listItem} layout>
                        <Card className="p-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-ink text-sm">
                                  {DISPUTE_REASON_LABELS[d.reason] || d.reason}
                                </span>
                                <span
                                  className={`stamp ${
                                    d.status === "resolved"
                                      ? "stamp-completed"
                                      : d.status === "dismissed"
                                      ? "stamp-cancelled"
                                      : "stamp-pending"
                                  }`}
                                >
                                  {d.status === "resolved" ? "Resolved" : d.status === "dismissed" ? "Dismissed" : "Open"}
                                </span>
                              </div>
                              <div className="text-xs text-inkSoft mt-1">
                                {d.reportedBy?.name} ({d.reportedBy?.role}) reported {d.reportedAgainst?.name}
                                {d.pickup?.scrapType && <> · {d.pickup.scrapType} pickup, {formatPrice(d.pickup.price)}</>}
                              </div>
                              <div className="text-xs text-inkFaint mt-0.5 font-mono">
                                Filed {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                              {d.description && (
                                <p className="text-sm text-ink mt-2 bg-surfaceRaised border border-line rounded-ticket p-2.5">
                                  {d.description}
                                </p>
                              )}
                              {d.status !== "open" && d.resolutionNotes && (
                                <p className="text-xs text-inkSoft mt-2">
                                  <span className="font-semibold">
                                    {d.status === "resolved" ? "Resolved" : "Dismissed"} by {d.resolvedBy?.name}:
                                  </span>{" "}
                                  {d.resolutionNotes}
                                </p>
                              )}
                            </div>

                            {d.status === "open" && (
                              <div className="flex flex-col gap-2 items-end shrink-0 w-full sm:w-56">
                                <input
                                  type="text"
                                  placeholder="Resolution note (optional)"
                                  value={resolvingNote[d._id] || ""}
                                  onChange={(e) =>
                                    setResolvingNote((prev) => ({ ...prev, [d._id]: e.target.value }))
                                  }
                                  className="field-input text-xs !py-1.5 w-full"
                                />
                                <div className="flex gap-2">
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleResolveDispute(d, "dismissed")}
                                    disabled={actingId === d._id}
                                    className="text-xs font-semibold text-inkFaint hover:text-danger"
                                  >
                                    Dismiss
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleResolveDispute(d, "resolved")}
                                    disabled={actingId === d._id}
                                    className="btn-primary !py-1.5 !px-3 text-xs"
                                  >
                                    {actingId === d._id ? "…" : "Mark resolved"}
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </div>
            )}

            {tab === "pickups" && (
              <div>
                <div className="flex justify-end mb-4">
                  <motion.button whileTap={{ scale: 0.96 }} onClick={handleExportPickups} disabled={exportingPickups} className="btn-secondary">
                    {exportingPickups ? "Exporting…" : "Export CSV"}
                  </motion.button>
                </div>
                <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-2">
                  {pickups.length === 0 ? (
                    <Card className="p-10 text-center text-inkSoft">No pickups on the platform yet.</Card>
                  ) : (
                    pickups.map((p) => (
                      <motion.div key={p._id} variants={listItem}>
                        <Card className="p-4 flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <div className="font-medium text-ink capitalize">{p.scrapType}</div>
                            <div className="text-xs text-inkSoft mt-0.5">
                              {p.user?.name} → {p.collector?.name || "unassigned"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-ink">{formatPrice(p.price)}</span>
                            <StatusStamp status={p.status} />
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}