import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import Card from "../ui/Card";
import { formatPrice } from "../../utils/formatPrice";

const COLORS = {
  rust: "#A63D24",
  inkSoft: "#6B5A47",
  line: "#D8C9AE",
};

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-surfaceRaised border border-line rounded-md px-3 py-2 shadow-md text-xs">
      <div className="font-mono text-inkFaint mb-1">{shortDate(label)}</div>
      <div className="text-ink font-semibold">{formatPrice(value)}</div>
    </div>
  );
}

export default function EarningsChart({ series }) {
  const hasAnyEarnings = series?.some((d) => d.earned > 0);

  return (
    <Card className="p-5">
      <h3 className="font-display font-semibold text-ink text-sm mb-4">Earnings — last 30 days</h3>
      {!hasAnyEarnings ? (
        <p className="text-sm text-inkFaint text-center py-14">
          No earnings yet in this window — complete a pickup to see it here.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={series} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.rust} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.rust} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: COLORS.inkSoft }}
              interval={5}
              axisLine={{ stroke: COLORS.line }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: COLORS.inkSoft }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="earned"
              stroke={COLORS.rust}
              strokeWidth={2}
              fill="url(#earningsFill)"
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}