import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import ErrorBox from "../components/common/ErrorBox";
import useDocumentMeta from "../hooks/useDocumentMeta";
import ScrapRateTrendChart from "../components/ScrapRateTrendChart";
import { getScrapRates, getScrapRateHistory } from "../services/scrapRateService";
import { SCRAP_TYPE_LABELS } from "../utils/pickupItems";

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// Public, unauthenticated — anyone can check today's per-kg rates before
// requesting a pickup. Rates themselves are edited from the admin panel's
// "Scrap rates" tab (see components/admin/ScrapRatesTab.jsx).
export default function ScrapRates() {
  useDocumentMeta({ title: "Scrap Rates" });
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [days, setDays] = useState(90);

  useEffect(() => {
    getScrapRateHistory(days)
      .then((res) => setHistory(res.data.history))
      .catch(() => setHistory([]));
  }, [days]);

  useEffect(() => {
    getScrapRates()
      .then((res) => setRates(res.data.rates))
      .catch(() => setError("Couldn't load current rates. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Today's scrap rates</h1>
      <p className="text-sm text-inkSoft mb-6">
        Per-kg rates used to estimate what your scrap is worth. Actual payment is settled with your
        collector when it's weighed.
      </p>

      {error && (
        <div className="mb-5">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-3">
          {rates.map((r) => (
            <motion.div key={r.scrapType} variants={listItem}>
              <Card className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-ink">{SCRAP_TYPE_LABELS[r.scrapType] || r.scrapType}</span>
                <span className="font-display text-lg font-bold text-rust">₹{r.ratePerKg}/kg</span>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && (
        <ScrapRateTrendChart history={history} currentRates={rates} days={days} onRangeChange={setDays} />
      )}
    </div>
  );
}