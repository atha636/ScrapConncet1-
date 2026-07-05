import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyRequests } from "../../services/pickupService";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import StatusStamp from "../../components/ui/StatusStamp";
import { formatPrice } from "../../utils/formatPrice";
import useDocumentMeta from "../../hooks/useDocumentMeta";

export default function Dashboard() {
  useDocumentMeta({ title: "Dashboard", noindex: true });

  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, earned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRequests({ page: 1, limit: 5 })
      .then((res) => {
        setRecent(res.data.data);
        const all = res.data.data;
        setStats({
          total: res.data.total,
          pending: all.filter((p) => p.status === "pending").length,
          completed: all.filter((p) => p.status === "completed").length,
          earned: all.filter((p) => p.status === "completed").reduce((s, p) => s + p.price, 0),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        {greeting()}, {user?.name?.split(" ")[0] || "there"}
      </h1>
      <p className="text-sm text-inkSoft mb-6">Here's what's happening with your pickups.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total requests", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Completed", value: stats.completed },
          { label: "Total earned", value: formatPrice(stats.earned) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-inkFaint uppercase tracking-wide font-mono mb-1">{s.label}</div>
            <div className="font-display text-xl font-bold text-ink">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
        <Link to="/my-requests" className="text-sm font-semibold text-rust hover:underline">View all</Link>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : recent.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-inkSoft mb-4">No pickups yet — request your first one.</p>
          <Link to="/request" className="btn-primary inline-flex">Request a pickup</Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {recent.map((item) => (
            <Card key={item._id} className="p-4 pt-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium text-ink capitalize">{item.scrapType}</div>
                <div className="text-xs text-inkFaint font-mono mt-0.5">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-ink">{formatPrice(item.price)}</span>
                <StatusStamp status={item.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}