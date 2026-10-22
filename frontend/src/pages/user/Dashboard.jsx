import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyRequests } from "../../services/pickupService";
import { getMyUpi } from "../../services/paymentService";
import OnboardingChecklist from "../../components/common/OnboardingChecklist";
import { readFlag, writeFlag } from "../../utils/onboardingStore";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/common/EmptyState";
import CardSkeleton from "../../components/common/CardSkeleton";
import StatusStamp from "../../components/ui/StatusStamp";
import { formatPrice } from "../../utils/formatPrice";
import { getPickupItems, formatItemsLabel } from "../../utils/pickupItems";
import { useT } from "../../i18n/core";
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

  const { t } = useT();
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  // null while loading, then whether a UPI ID is saved
  const [hasUpi, setHasUpi] = useState(null);
  const [seenRates, setSeenRates] = useState(() => readFlag(`u:${user?._id}:rates`));

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
    getMyUpi()
      .then((res) => setHasUpi(!!res.data?.upiId))
      .catch(() => setHasUpi(null));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("greet.morning");
    if (h < 18) return t("greet.afternoon");
    return t("greet.evening");
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        {greeting()}, {user?.name?.split(" ")[0] || t("greet.there")}
      </h1>
      <p className="text-sm text-inkSoft mb-6">{t("userDash.subtitle")}</p>

      {!loading && hasUpi !== null && (
        <OnboardingChecklist
          storageKey={`u:${user?._id}`}
          title={t("onbUser.title")}
          steps={[
            {
              key: "request",
              title: t("onbUser.requestTitle"),
              hint: t("onbUser.requestHint"),
              done: stats.total > 0,
              cta: t("onbUser.requestCta"),
              to: "/request",
            },
            {
              key: "upi",
              title: t("onbUser.upiTitle"),
              hint: t("onbUser.upiHint"),
              done: hasUpi,
              cta: t("onbUser.upiCta"),
              to: "/profile",
            },
            {
              key: "rates",
              title: t("onbUser.ratesTitle"),
              hint: t("onbUser.ratesHint"),
              done: seenRates,
              cta: t("onbUser.ratesCta"),
              to: "/scrap-rates",
              onClick: () => {
                writeFlag(`u:${user?._id}:rates`);
                setSeenRates(true);
              },
            },
            {
              key: "complete",
              title: t("onbUser.completeTitle"),
              hint: t("onbUser.completeHint"),
              done: stats.completed > 0,
            },
          ]}
        />
      )}

      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
      >
        {[
          { label: t("userDash.total"), value: stats.total },
          { label: t("userDash.pending"), value: stats.pending },
          { label: t("userDash.completed"), value: stats.completed },
          { label: t("userDash.earned"), value: stats.earned, isMoney: true },
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
        <h2 className="font-display text-lg font-semibold text-ink">{t("userDash.recent")}</h2>
        <Link to="/my-requests" className="text-sm font-semibold text-rust hover:underline">{t("userDash.viewAll")}</Link>
      </div>

      {loading ? (
        <CardSkeleton count={3} withImage />
      ) : recent.length === 0 ? (
        <EmptyState
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
            </svg>
          }
          title={t("userDash.empty")}
          action={{ label: t("userDash.requestCta"), to: "/request" }}
        />
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
                        alt={getPickupItems(item).length === 1 ? getPickupItems(item)[0].scrapType : "Scrap pickup"}
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
                      <div className="font-medium text-ink capitalize">{formatItemsLabel(getPickupItems(item), t)}</div>
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