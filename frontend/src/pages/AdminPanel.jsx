import { useEffect, useState, useCallback } from "react";
import {
  getAdminStats,
  getAdminUsers,
  deactivateUser,
  activateUser,
  getAllPickups,
} from "../services/adminService";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import CardSkeleton from "../components/common/CardSkeleton";
import ErrorBox from "../components/common/ErrorBox";
import StatusStamp from "../components/ui/StatusStamp";
import { formatPrice } from "../utils/formatPrice";
import useDocumentMeta from "../hooks/useDocumentMeta";

export default function AdminPanel() {
  useDocumentMeta({ title: "Admin Panel", noindex: true });
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const loadOverview = useCallback(async () => {
    const res = await getAdminStats();
    setStats(res.data);
  }, []);

  const loadUsers = useCallback(async (search = "") => {
    const res = await getAdminUsers({ limit: 30, search: search || undefined });
    setUsers(res.data.data);
  }, []);

  const loadPickups = useCallback(async () => {
    const res = await getAllPickups({ limit: 30 });
    setPickups(res.data.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const load = tab === "overview" ? loadOverview : tab === "users" ? () => loadUsers() : loadPickups;
    load()
      .catch(() => setError("Couldn't load this section. Try refreshing."))
      .finally(() => setLoading(false));
  }, [tab, loadOverview, loadUsers, loadPickups]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers(userSearch);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Admin panel</h1>
      <p className="text-sm text-inkSoft mb-6">Platform-wide oversight — users, pickups, and stats.</p>

      <div className="flex gap-1 mb-6 border-b border-line">
        {[
          { key: "overview", label: "Overview" },
          { key: "users", label: "Users" },
          { key: "pickups", label: "All pickups" },
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

      {loading ? (
        tab === "overview" ? <Loader /> : <CardSkeleton count={4} />
      ) : (
        <>
          {tab === "overview" && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Requesters", value: stats.totalUsers },
                { label: "Collectors", value: stats.totalCollectors },
                { label: "Total pickups", value: stats.totalPickups },
                { label: "Pending", value: stats.pendingCount },
                { label: "In progress", value: stats.activeCount },
                { label: "Completed", value: stats.completedCount },
                { label: "Cancelled", value: stats.cancelledCount },
                { label: "Value moved", value: formatPrice(stats.totalValueMoved) },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <div className="text-xs text-inkFaint uppercase tracking-wide font-mono mb-1">{s.label}</div>
                  <div className="font-display text-xl font-bold text-ink">{s.value}</div>
                </Card>
              ))}
            </div>
          )}

          {tab === "users" && (
            <div>
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="field-input"
                />
                <button type="submit" className="btn-secondary shrink-0">Search</button>
              </form>

              <div className="space-y-2">
                {users.length === 0 ? (
                  <Card className="p-10 text-center text-inkSoft">No users match your search.</Card>
                ) : (
                  users.map((u) => (
                  <Card key={u._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-medium text-ink">
                        {u.name} <span className="text-xs text-inkFaint font-mono capitalize">· {u.role}</span>
                      </div>
                      <div className="text-xs text-inkSoft">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-semibold ${u.isActive ? "text-amber-dark" : "text-danger"}`}>
                        {u.isActive ? "Active" : "Deactivated"}
                      </span>
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={actingId === u._id}
                          className={u.isActive ? "btn-secondary !py-1.5 !px-3 text-xs" : "btn-primary !py-1.5 !px-3 text-xs"}
                        >
                          {actingId === u._id ? "…" : u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
                  </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "pickups" && (
            <div className="space-y-2">
              {pickups.length === 0 ? (
                <Card className="p-10 text-center text-inkSoft">No pickups on the platform yet.</Card>
              ) : (
                pickups.map((p) => (
                <Card key={p._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
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
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}