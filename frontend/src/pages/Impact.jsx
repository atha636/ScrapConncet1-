import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import ErrorBox from "../components/common/ErrorBox";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { useAuth } from "../context/AuthContext";
import { getMyImpact } from "../services/impactService";
import { downloadImpactCertificate } from "../utils/impactCertificate";
import { SCRAP_TYPE_LABELS } from "../utils/pickupItems";

const listStagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

function StatCard({ label, value, unit }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="p-4 text-center">
        <div className="font-display text-3xl font-bold text-rust">
          {value}
          {unit && <span className="text-base text-inkSoft ml-1">{unit}</span>}
        </div>
        <div className="text-xs text-inkSoft mt-1">{label}</div>
      </Card>
    </motion.div>
  );
}

export default function Impact() {
  useDocumentMeta({ title: "My impact" });
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyImpact()
      .then((res) => setData(res.data))
      .catch(() => setError("Couldn't load your impact. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const isCollector = user?.role === "collector";
  const maxKg = data?.breakdown?.[0]?.kg || 1;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">My environmental impact</h1>
      <p className="text-sm text-inkSoft mb-6">
        {isCollector
          ? "What you've collected and kept out of landfill, from your completed pickups."
          : "What you've sent for recycling, from your completed pickups."}
      </p>

      {error && (
        <div className="mb-5">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {data && data.pickupCount === 0 && (
        <Card className="p-6 text-center text-sm text-inkSoft">
          Nothing here yet — your impact shows up once a pickup is completed.
        </Card>
      )}

      {data && data.pickupCount > 0 && (
        <>
          <motion.div variants={listStagger} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Completed pickups" value={data.pickupCount} />
            <StatCard label="Scrap recycled" value={data.totalKg} unit="kg" />
            <StatCard label="CO₂ saved (est.)" value={data.co2Kg} unit="kg" />
            <StatCard label="Trees for a year (est.)" value={data.treesEquivalent} />
          </motion.div>

          <Card className="p-4 mt-6">
            <h2 className="font-display text-lg font-bold text-ink mb-3">By material</h2>
            <div className="space-y-3">
              {data.breakdown.map((b) => (
                <div key={b.scrapType}>
                  <div className="flex justify-between text-sm text-ink mb-1">
                    <span>{SCRAP_TYPE_LABELS[b.scrapType] || b.scrapType}</span>
                    <span className="text-inkSoft">
                      {b.kg} kg · {b.co2Kg} kg CO₂
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-line/50 overflow-hidden">
                    <div className="h-full bg-rust" style={{ width: `${Math.max(4, (b.kg / maxKg) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {data.destinations?.length > 0 && (
            <Card className="p-4 mt-6">
              <h2 className="font-display text-lg font-bold text-ink mb-3">Where it went</h2>
              <div className="divide-y divide-line">
                {data.destinations.map((d) => (
                  <div key={`${d.name}-${d.city}`} className="flex justify-between py-2 text-sm">
                    <span className="text-ink">
                      {d.name} <span className="text-inkSoft">· {d.city}</span>
                    </span>
                    <span className="text-inkSoft">{d.kg} kg</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-inkFaint mt-2">Counts only loads the collector has recorded as delivered.</p>
            </Card>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                downloadImpactCertificate({
                  name: user?.name,
                  totalKg: data.totalKg,
                  co2Kg: data.co2Kg,
                  treesEquivalent: data.treesEquivalent,
                  role: user?.role,
                })
              }
              className="bg-rust text-white text-sm font-medium px-5 py-2 rounded-md"
            >
              Download certificate
            </button>
            <span className="text-xs text-inkFaint">
              CO₂ figures are estimates from average recycling savings per material.
            </span>
          </div>
        </>
      )}
    </div>
  );
}