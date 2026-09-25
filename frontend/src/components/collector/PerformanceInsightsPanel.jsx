import { useEffect, useState } from "react";
import { getPerformanceInsights } from "../../services/pickupService";
import { formatPrice } from "../../utils/formatPrice";
import Card from "../ui/Card";

const HOUR_LABEL = (h) => {
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${period}`;
};

export default function PerformanceInsightsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerformanceInsights()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const { completed, earned, avgRating, busiest } = data;

  // A delta only means something once there's a "before" to compare
  // against — with zero last week, "+100%" or "∞" would just be noise,
  // so this stays silent rather than showing a misleading number.
  const delta = (thisWeek, lastWeek) => {
    if (!lastWeek) return null;
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    return { pct, up: pct >= 0 };
  };

  const completedDelta = delta(completed.thisWeek, completed.lastWeek);
  const earnedDelta = delta(earned.thisWeek, earned.lastWeek);

  const DeltaTag = ({ d }) =>
    d ? (
      <span className={`text-[11px] font-semibold ${d.up ? "text-emerald-600" : "text-inkFaint"}`}>
        {d.up ? "▲" : "▼"} {Math.abs(d.pct)}% vs last week
      </span>
    ) : null;

  return (
    <Card className="p-4 mb-4">
      <h2 className="text-sm font-bold text-ink flex items-center gap-1.5 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.1-3.5-3.5L4.5 15" />
        </svg>
        This week vs last week
      </h2>

      <div className="grid grid-cols-3 gap-2.5 mb-3">
        <div className="rounded-ticket border border-line px-2.5 py-2.5">
          <div className="text-[11px] text-inkFaint mb-0.5">Completed</div>
          <div className="text-lg font-bold text-ink font-mono">{completed.thisWeek}</div>
          <DeltaTag d={completedDelta} />
        </div>
        <div className="rounded-ticket border border-line px-2.5 py-2.5">
          <div className="text-[11px] text-inkFaint mb-0.5">Earned</div>
          <div className="text-lg font-bold text-ink font-mono">{formatPrice(earned.thisWeek)}</div>
          <DeltaTag d={earnedDelta} />
        </div>
        <div className="rounded-ticket border border-line px-2.5 py-2.5">
          <div className="text-[11px] text-inkFaint mb-0.5">Avg rating</div>
          <div className="text-lg font-bold text-ink font-mono">
            {avgRating.thisWeek != null ? avgRating.thisWeek.toFixed(1) : "—"}
          </div>
          {avgRating.thisWeek != null && avgRating.lastWeek != null && (
            <span className="text-[11px] text-inkFaint">was {avgRating.lastWeek.toFixed(1)} last week</span>
          )}
        </div>
      </div>

      {busiest && (
        <div className="flex items-center gap-2 px-3 py-2 bg-rust/[0.05] border border-rust/20 rounded-ticket text-sm">
          <span className="text-base leading-none">📈</span>
          <span className="text-ink">
            You complete the most pickups on <span className="font-semibold">{busiest.day}s</span>, usually
            around <span className="font-semibold">{HOUR_LABEL(busiest.hour)}</span>
            <span className="text-inkFaint"> (based on your last {busiest.sampleSize} pickups)</span>
          </span>
        </div>
      )}
    </Card>
  );
}