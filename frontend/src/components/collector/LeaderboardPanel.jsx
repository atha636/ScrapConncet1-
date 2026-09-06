import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getLeaderboard } from "../../services/pickupService";
import { useAuth } from "../../context/AuthContext";
import Card from "../ui/Card";

const listStagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const listItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } };

/**
 * Self-contained — fetches on mount, fails quietly (this is an engagement
 * nice-to-have, not core functionality, so a failed load just means the
 * panel doesn't render rather than breaking the Wallet tab).
 */
export default function LeaderboardPanel() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const { top, me, windowLabel } = data;
  const meInTop = top.some((t) => t.collectorId === user?._id || t.collectorId === user?.id);

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 4H3v2a4 4 0 0 0 4 4M17 4h4v2a4 4 0 0 1-4 4" />
          </svg>
          Top collectors
        </h2>
        <span className="text-[11px] text-inkFaint font-mono">{windowLabel}</span>
      </div>

      {me.streak > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-rust/[0.07] border border-rust/20 rounded-ticket">
          <span className="text-base leading-none">🔥</span>
          <span className="text-sm text-ink">
            <span className="font-bold">{me.streak}-day streak</span> — a completed pickup every day, keep it going
          </span>
        </div>
      )}

      {top.length === 0 ? (
        <p className="text-sm text-inkSoft py-2">No completed pickups in this window yet — be the first.</p>
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-1.5">
          {top.map((entry) => {
            const isMe = entry.collectorId === user?._id || entry.collectorId === user?.id;
            return (
              <motion.div
                key={entry.collectorId}
                variants={listItem}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-ticket text-sm ${
                  isMe ? "bg-rust/[0.08] border border-rust/25" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`font-mono text-xs w-5 text-right shrink-0 ${entry.rank <= 3 ? "text-rust font-bold" : "text-inkFaint"}`}>
                    {entry.rank}
                  </span>
                  <span className={`truncate ${isMe ? "font-semibold text-ink" : "text-ink"}`}>
                    {isMe ? "You" : entry.name}
                  </span>
                </div>
                <span className="font-mono text-xs text-inkSoft shrink-0">{entry.completedCount} done</span>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {!meInTop && me.completedCount > 0 && (
        <div className="flex items-center justify-between px-2.5 py-1.5 mt-2 pt-2 border-t border-line text-sm">
          <span className="text-inkSoft">
            Your rank: <span className="font-semibold text-ink">#{me.rank}</span>
          </span>
          <span className="font-mono text-xs text-inkSoft">{me.completedCount} done</span>
        </div>
      )}
    </Card>
  );
}