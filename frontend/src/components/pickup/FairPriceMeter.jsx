import { useEffect, useState } from "react";
import { getFairPrice } from "../../services/pickupService";
import { formatPrice } from "../../utils/formatPrice";
import { useT } from "../../i18n/core";

// How the same position on the bar reads to each side. In ScrapConnect the
// collector pays the requester, so a high number is good news for the
// requester and a warning for the collector (and the reverse for a low one).
const MESSAGES = {
  requester: { low: "fair.reqLow", fair: "fair.reqFair", high: "fair.reqHigh" },
  collector: { low: "fair.colLow", fair: "fair.colFair", high: "fair.colHigh" },
};

const TONE = {
  low: "text-amber-dark",
  fair: "text-emerald-700",
  high: "text-amber-dark",
};

const fairLevel = (amount, band) => (amount < band.low ? "low" : amount > band.high ? "high" : "fair");

/**
 * Shows where an amount sits against the fair range for this pickup.
 * Renders nothing until the range loads, or when the pickup has no
 * weights to price from, so it never gets in the way of the offer form.
 */
export default function FairPriceMeter({ pickupId, amount, role, label }) {
  const { t } = useT();
  label = label || t("fair.thisPrice");
  const [band, setBand] = useState(null);

  useEffect(() => {
    if (!pickupId) return;
    let alive = true;
    getFairPrice(pickupId)
      .then((res) => alive && setBand(res.data?.reliable ? res.data : null))
      .catch(() => alive && setBand(null));
    return () => {
      alive = false;
    };
  }, [pickupId]);

  const value = Number(amount);
  if (!band || !value || value <= 0) return null;

  const level = fairLevel(value, band);
  // Bar runs from 0 to twice the expected price; the fair zone is shaded.
  const max = band.mid * 2 || 1;
  const pct = (n) => Math.max(0, Math.min(100, (n / max) * 100));
  const messages = MESSAGES[role] || MESSAGES.requester;

  return (
    <div className="mb-3" aria-live="polite">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-semibold uppercase tracking-wide text-inkFaint">{t("fair.title")}</span>
        <span className="text-inkFaint">
          {label}: <span className="font-mono font-semibold text-ink">{formatPrice(value)}</span>
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-line/60" role="img" aria-label={`${label}: ${t(messages[level], { low: formatPrice(band.low), high: formatPrice(band.high) })}`}>
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-500/40"
          style={{ left: `${pct(band.low)}%`, width: `${pct(band.high) - pct(band.low)}%` }}
        />
        <div
          className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink border-2 border-surface transition-[left] duration-300"
          style={{ left: `${pct(value)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-inkFaint mt-1 font-mono">
        <span>{formatPrice(band.low)}</span>
        <span>{formatPrice(band.high)}</span>
      </div>

      <p className={`text-xs font-medium mt-0.5 ${TONE[level]}`}>{t(messages[level], { low: formatPrice(band.low), high: formatPrice(band.high) })}</p>
      <p className="text-[10px] text-inkFaint mt-0.5">
        {band.basis === "history"
          ? t("fair.basisHistory", { n: band.samples })
          : t("fair.basisRate")}
      </p>
    </div>
  );
}