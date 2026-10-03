import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import Card from "./ui/Card";
import { SCRAP_TYPE_LABELS } from "../utils/pickupItems";

const TYPE_COLORS = {
  metal: "#A63D24",
  plastic: "#C4841E",
  paper: "#6B5A47",
  "e-waste": "#4A3B28",
  glass: "#8C2F1B",
  other: "#D8C9AE",
};

const RANGES = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// history: [{scrapType, ratePerKg, changedAt}] oldest first
// currentRates: [{scrapType, ratePerKg}] — used as the final "now" point
export default function ScrapRateTrendChart({ history, currentRates, days, onRangeChange }) {
  const [hidden, setHidden] = useState({});

  const { rows, types } = useMemo(() => {
    const types = [...new Set(history.map((h) => h.scrapType))];
    if (types.length === 0) return { rows: [], types };

    const stamps = [...new Set(history.map((h) => new Date(h.changedAt).getTime()))].sort((a, b) => a - b);
    const last = {};
    const rows = stamps.map((ts) => {
      history.forEach((h) => {
        if (new Date(h.changedAt).getTime() === ts) last[h.scrapType] = h.ratePerKg;
      });
      return { ts, ...last };
    });

    // Closing point at "now" so every line extends to today.
    const now = { ts: Date.now() };
    types.forEach((t) => {
      const cur = currentRates.find((r) => r.scrapType === t);
      now[t] = cur ? cur.ratePerKg : last[t];
    });
    rows.push(now);

    return { rows, types };
  }, [history, currentRates]);

  return (
    <Card className="p-4 mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-ink">Rate trends</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => onRangeChange(r.days)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                days === r.days ? "bg-rust text-white border-rust" : "border-line text-inkSoft hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-inkSoft py-8 text-center">
          No rate changes recorded in this period yet. Trends will appear here once rates are updated.
        </p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8C9AE" />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={fmtDate}
                tick={{ fontSize: 11, fill: "#6B5A47" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#6B5A47" }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                labelFormatter={fmtDate}
                formatter={(v, name) => [`₹${v}/kg`, SCRAP_TYPE_LABELS[name] || name]}
              />
              <Legend
                formatter={(name) => SCRAP_TYPE_LABELS[name] || name}
                onClick={(e) => setHidden((h) => ({ ...h, [e.dataKey]: !h[e.dataKey] }))}
                wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
              />
              {types.map((t) => (
                <Line
                  key={t}
                  type="stepAfter"
                  dataKey={t}
                  stroke={TYPE_COLORS[t] || "#6B5A47"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={!!hidden[t]}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}