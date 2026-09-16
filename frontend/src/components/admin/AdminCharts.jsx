import { motion } from "framer-motion";
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

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
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

export default function AdminCharts({ series, stats, growthStats }) {
  const pieData = stats
    ? [
        { name: "Pending", value: stats.pendingCount },
        { name: "In progress", value: stats.activeCount },
        { name: "Completed", value: stats.completedCount },
        { name: "Cancelled", value: stats.cancelledCount },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pickups over time */}
        <motion.div variants={fadeUp}>
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
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Revenue over time */}
        <motion.div variants={fadeUp}>
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
                <Bar dataKey="revenue" fill={COLORS.amber} radius={[3, 3, 0, 0]} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Status breakdown */}
      <motion.div variants={fadeUp}>
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
                  animationDuration={700}
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
      </motion.div>

      {/* Growth & trust — everything built on top of the core pickup flow
          (referrals, badges, collector reliability) that has no other
          admin-facing view. Kept as its own section below the pickup
          volume/revenue/status charts above, since these are a snapshot of
          current state rather than a 30-day trend the way those are. */}
      {growthStats && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <motion.div variants={fadeUp}>
              <Card className="p-5">
                <div className="text-xs font-semibold text-inkFaint uppercase tracking-wide mb-1">
                  Referral conversion
                </div>
                <div className="font-display font-bold text-2xl text-ink">
                  {growthStats.referrals.conversionRate == null
                    ? "—"
                    : `${Math.round(growthStats.referrals.conversionRate * 100)}%`}
                </div>
                <div className="text-xs text-inkSoft mt-1">
                  {growthStats.referrals.completed} of {growthStats.referrals.total} referred signups activated
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="p-5">
                <div className="text-xs font-semibold text-inkFaint uppercase tracking-wide mb-1">
                  Referral rewards paid
                </div>
                <div className="font-display font-bold text-2xl text-ink">
                  {formatPrice(growthStats.referrals.totalRewardPaid)}
                </div>
                <div className="text-xs text-inkSoft mt-1">
                  {growthStats.referrals.pending} referral{growthStats.referrals.pending === 1 ? "" : "s"} still
                  pending
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="p-5">
                <div className="text-xs font-semibold text-inkFaint uppercase tracking-wide mb-1">
                  Typical collector reliability
                </div>
                <div className="font-display font-bold text-2xl text-ink">
                  {growthStats.reliability.avgCompletionRate == null
                    ? "—"
                    : `${Math.round(growthStats.reliability.avgCompletionRate * 100)}%`}
                </div>
                <div className="text-xs text-inkSoft mt-1">
                  Averaged across {growthStats.reliability.collectorsWithEnoughHistory} collector
                  {growthStats.reliability.collectorsWithEnoughHistory === 1 ? "" : "s"} with enough history
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={fadeUp}>
            <Card className="p-5">
              <h3 className="font-display font-semibold text-ink mb-4">Collectors by pickup milestone</h3>
              {growthStats.badges.milestones.every((m) => m.count === 0) ? (
                <p className="text-sm text-inkFaint text-center py-10">
                  No collector has reached a milestone yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={growthStats.badges.milestones}
                    margin={{ left: -20, right: 10, top: 5, bottom: 0 }}
                  >
                    <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: COLORS.inkSoft }}
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
                      content={<ChartTooltip formatter={(v) => `${v} collector${v === 1 ? "" : "s"}`} />}
                    />
                    <Bar dataKey="count" fill={COLORS.rust} radius={[3, 3, 0, 0]} animationDuration={700} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-dashed border-line text-sm">
                <span className="text-inkSoft">
                  <span className="font-semibold text-ink">{growthStats.badges.topRated}</span> Top rated
                </span>
                <span className="text-inkSoft">
                  <span className="font-semibold text-ink">{growthStats.badges.fastResponder}</span> Fast
                  responder
                </span>
                <span className="text-inkSoft">
                  <span className="font-semibold text-ink">{growthStats.badges.reliable}</span> Reliable
                </span>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}