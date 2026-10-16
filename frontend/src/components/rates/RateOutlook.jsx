import { motion } from "framer-motion";
import Card from "../ui/Card";
import { useRateOutlooks } from "../../hooks/useRateOutlooks";
import { sparkPath } from "../../utils/rateOutlook";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

const TREND = {
  rising: { icon: "▲", cls: "text-rust", label: "Rising" },
  falling: { icon: "▼", cls: "text-danger", label: "Falling" },
  steady: { icon: "●", cls: "text-inkFaint", label: "Steady" },
};

export default function RateOutlook({ rates }) {
  const { outlooks, now } = useRateOutlooks(rates);
  if (!outlooks) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-bold text-ink mb-1">Should I sell now?</h2>
      <p className="text-sm text-inkSoft mb-4">
        How each rate has moved over the last 90 days, so you can pick a good moment to request a pickup.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {rates.map((r, i) => {
          const o = outlooks[r.scrapType];
          if (!o) return null;
          const t = TREND[o.trend];
          const d = sparkPath(o.spark, now);
          return (
            <motion.div key={r.scrapType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{SCRAP_TYPE_LABELS[r.scrapType] || r.scrapType}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${t.cls}`}>
                      {t.icon} {t.label}
                      {o.trend !== "steady" && ` ${o.changePct > 0 ? "+" : ""}${o.changePct}% in 30 days`}
                    </div>
                  </div>
                  {d && (
                    <svg viewBox="0 0 100 28" className={`w-24 h-7 shrink-0 ${t.cls}`} aria-hidden="true">
                      <motion.path
                        d={d}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-inkSoft mt-2.5">{o.tip}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <p className="text-[11px] text-inkFaint mt-3">
        Rates change only when the platform updates them, so this shows past movement — it can't predict the next change.
      </p>
    </div>
  );
}