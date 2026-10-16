import { useMemo } from "react";
import { useRateOutlooks } from "../../hooks/useRateOutlooks";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

/** One-line nudges under the items list, e.g. "Metal rate is up 8% this month". */
export default function RateTrendHint({ types, liveRates }) {
  const rates = useMemo(
    () => (liveRates ? Object.entries(liveRates).map(([scrapType, ratePerKg]) => ({ scrapType, ratePerKg })) : null),
    [liveRates]
  );
  const { outlooks } = useRateOutlooks(rates);
  if (!outlooks) return null;

  const lines = [...new Set(types)]
    .map((type) => ({ type, o: outlooks[type] }))
    .filter(({ o }) => o && o.trend !== "steady");
  if (lines.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {lines.map(({ type, o }) => (
        <p key={type} className={`text-xs font-medium ${o.trend === "rising" ? "text-rust" : "text-danger"}`}>
          {o.trend === "rising" ? "▲" : "▼"} {SCRAP_TYPE_LABELS[type] || type} rate is {o.trend === "rising" ? "up" : "down"}{" "}
          {Math.abs(o.changePct)}% this month. {o.tip}
        </p>
      ))}
    </div>
  );
}