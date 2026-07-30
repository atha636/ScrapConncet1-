import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyRequests } from "../../services/pickupService";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import CardSkeleton from "../../components/common/CardSkeleton";
import StatusStamp from "../../components/ui/StatusStamp";
import { formatPrice } from "../../utils/formatPrice";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import useCountUp from "../../hooks/useCountUp";

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// Animated number for the stat cards — ticks up from 0 once data has
// loaded, matching the same count-up used in the homepage receipt hero.
function StatValue({ value, isMoney }) {
  const animated = useCountUp(value, true, 600);
  return <>{isMoney ? formatPrice(animated) : animated}</>;
}

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

      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
      >
        {[
          { label: "Total requests", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Completed", value: stats.completed },
          { label: "Total earned", value: stats.earned, isMoney: true },
        ].map((s) => (
          <motion.div key={s.label} variants={listItem}>
            <Card className="p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,18,0.08)]">
              <div className="text-xs text-inkFaint uppercase tracking-wide font-mono mb-1">{s.label}</div>
              <div className="font-display text-xl font-bold text-ink">
                {loading ? "—" : <StatValue value={s.value} isMoney={s.isMoney} />}
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
        <Link to="/my-requests" className="text-sm font-semibold text-rust hover:underline">View all</Link>
      </div>

      {loading ? (
        <CardSkeleton count={3} withImage />
      ) : recent.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="w-11 h-11 mx-auto mb-3 rounded-full border-2 border-dashed border-line flex items-center justify-center text-inkFaint">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
            </svg>
          </div>
          <p className="text-inkSoft mb-4">No pickups yet — request your first one.</p>
          <Link to="/request" className="btn-primary inline-flex">Request a pickup</Link>
        </Card>
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3">
          {recent.map((item) => (
            <motion.div key={item._id} variants={listItem}>
              <Link to="/my-requests">
                <Card className="p-4 pt-5 flex items-center justify-between gap-4 flex-wrap transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,18,0.08)]">
                  <div className="flex items-center gap-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.scrapType}
                        className="w-14 h-14 rounded-md object-cover shrink-0 border border-line"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-md shrink-0 border border-dashed border-line flex items-center justify-center text-inkFaint">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-ink capitalize">{item.scrapType}</div>
                      <div className="text-xs text-inkFaint font-mono mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-ink">{formatPrice(item.price)}</span>
                    <StatusStamp status={item.status} />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}