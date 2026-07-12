import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import Card from "../ui/Card";
import { formatPrice } from "../../utils/formatPrice";

const COLORS = {
  rust: "#A63D24",
  amber: "#C4841E",
  inkSoft: "#6B5A47",
  line: "#D8C9AE",
  danger: "#8C2F1B",
};

const STATUS_COLORS = {
  Pending: COLORS.amber,
  "In progress": COLORS.rust,
  Completed: "#4A3B28",
  Cancelled: COLORS.danger,
};

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Shared tooltip styling so it looks like the rest of the app (a small
// kraft-paper card) instead of Recharts' default plain white box.
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surfaceRaised border border-line rounded-md px-3 py-2 shadow-md text-xs">
      <div className="font-mono text-inkFaint mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-ink font-semibold">
          {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function AdminCharts({ series, stats }) {
  const pieData = stats
    ? [
        { name: "Pending", value: stats.pendingCount },
        { name: "In progress", value: stats.activeCount },
        { name: "Completed", value: stats.completedCount },
        { name: "Cancelled", value: stats.cancelledCount },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pickups over time */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-4">Pickups posted — last 30 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="pickupsFill" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} pickup${v === 1 ? "" : "s"}`} />}
                labelFormatter={shortDate}
              />
              <Area
                type="monotone"
                dataKey="pickups"
                stroke={COLORS.rust}
                strokeWidth={2}
                fill="url(#pickupsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue over time */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-4">Revenue completed — last 30 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
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
              <Tooltip content={<ChartTooltip formatter={formatPrice} />} labelFormatter={shortDate} />
              <Bar dataKey="revenue" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card className="p-5">
        <h3 className="font-display font-semibold text-ink mb-4">Pickup status breakdown</h3>
        {pieData.length === 0 ? (
          <p className="text-sm text-inkFaint text-center py-10">No pickups yet to break down.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 12, color: COLORS.inkSoft }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}