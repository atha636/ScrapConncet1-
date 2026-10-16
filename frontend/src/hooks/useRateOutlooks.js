import { useEffect, useMemo, useState } from "react";
import { getScrapRateHistory } from "../services/scrapRateService";
import { computeOutlook } from "../utils/rateOutlook";

/** Loads the last 90 days of rate changes once and computes an outlook per type. */
export function useRateOutlooks(rates) {
  const [history, setHistory] = useState(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    getScrapRateHistory(90)
      .then((res) => alive && setHistory(res.data.history))
      .catch(() => alive && setHistory([]));
    return () => { alive = false; };
  }, []);

  const outlooks = useMemo(() => {
    if (!history || !rates?.length) return null;
    const out = {};
    for (const r of rates) {
      out[r.scrapType] = computeOutlook(history.filter((h) => h.scrapType === r.scrapType), r.ratePerKg, now);
    }
    return out;
  }, [history, rates, now]);

  return { outlooks, now };
}