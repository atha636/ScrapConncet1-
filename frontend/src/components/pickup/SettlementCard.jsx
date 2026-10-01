import { useState } from "react";
import { confirmSettlement, disputeSettlement } from "../../services/pickupService";
import { formatPrice } from "../../utils/formatPrice";
import { getPickupItems, scrapLabel } from "../../utils/pickupItems";
import { useT } from "../../i18n/core";
import ErrorBox from "../common/ErrorBox";

// Statuses that end in a one-line summary; the text lives in the locales
// under settlement.<status>.
const DONE_STATUSES = ["auto_confirmed", "confirmed", "resolved"];

/**
 * Requester side of actual-weight settlement: shows estimated vs weighed
 * weight per item, and when the gap was large enough to need approval,
 * lets the requester confirm or dispute the new price.
 */
export default function SettlementCard({ pickup }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const s = pickup?.settlement;
  if (!s || !s.status || s.status === "none") return null;

  const est = getPickupItems(pickup);
  const pending = s.status === "pending_confirmation";

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn(); // server emits updatePickup, which refreshes this modal
    } catch (err) {
      setError(err.response?.data?.message || t("settlement.genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mt-4 rounded-md border p-4 ${pending ? "border-rust/40 bg-rust/5" : "border-line"}`}>
      <p className="text-sm font-bold text-ink mb-2">{t("settlement.title")}</p>

      <ul className="text-sm text-inkSoft space-y-1 mb-3">
        {(s.actualItems || []).map((a, i) => (
          <li key={i} className="flex justify-between">
            <span>{scrapLabel(a.scrapType, t)}</span>
            <span>
              {est[i]?.estimatedWeightKg ? `${t("weigh.est", { kg: est[i].estimatedWeightKg })} → ` : ""}
              <strong className="text-ink">{a.actualWeightKg}kg</strong>
            </span>
          </li>
        ))}
      </ul>

      {pending && (
        <>
          <p className="text-sm text-ink mb-3">
            {t("settlement.newPrice")} <strong>{formatPrice(s.proposedPrice)}</strong>{" "}
            <span className="text-inkSoft">({t("settlement.was", { price: formatPrice(s.originalPrice) })})</span>.{" "}
            {t("settlement.explain")}
          </p>
          {error && <div className="mb-2"><ErrorBox>{error}</ErrorBox></div>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary !py-2 !px-4 text-sm" disabled={busy} onClick={() => run(() => confirmSettlement(pickup._id))}>
              {busy ? t("settlement.working") : t("settlement.confirm")}
            </button>
            <button
              type="button"
              className="btn-secondary !py-2 !px-4 text-sm"
              disabled={busy}
              onClick={() => run(() => disputeSettlement(pickup._id, "Weighed amount looks wrong."))}
            >
              {t("settlement.dispute")}
            </button>
          </div>
        </>
      )}

      {s.status === "disputed" && (
        <p className="text-sm text-inkSoft">{t("settlement.disputed")}</p>
      )}
      {DONE_STATUSES.includes(s.status) && (
        <p className="text-sm text-inkSoft">
          {t(`settlement.${s.status}`)} {t("settlement.finalPrice")}:{" "}
          <strong className="text-ink">{formatPrice(s.finalPrice ?? pickup.price)}</strong>.
        </p>
      )}
    </div>
  );
}