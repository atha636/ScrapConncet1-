import { useState } from "react";
import { confirmSettlement, disputeSettlement } from "../../services/pickupService";
import { formatPrice } from "../../utils/formatPrice";
import { getPickupItems, SCRAP_TYPE_LABELS } from "../../utils/pickupItems";
import ErrorBox from "../common/ErrorBox";

const DONE_LABEL = {
  auto_confirmed: "Weight matched the estimate — price unchanged.",
  confirmed: "You confirmed the weighed amount.",
  resolved: "Settled by an admin after your dispute.",
};

/**
 * Requester side of actual-weight settlement: shows estimated vs weighed
 * weight per item, and when the gap was large enough to need approval,
 * lets the requester confirm or dispute the new price.
 */
export default function SettlementCard({ pickup }) {
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
      setError(err.response?.data?.message || "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mt-4 rounded-md border p-4 ${pending ? "border-rust/40 bg-rust/5" : "border-line"}`}>
      <p className="text-sm font-bold text-ink mb-2">Weighed amount</p>

      <ul className="text-sm text-inkSoft space-y-1 mb-3">
        {(s.actualItems || []).map((a, i) => (
          <li key={i} className="flex justify-between">
            <span>{SCRAP_TYPE_LABELS[a.scrapType] || a.scrapType}</span>
            <span>
              {est[i]?.estimatedWeightKg ? `${est[i].estimatedWeightKg}kg est. → ` : ""}
              <strong className="text-ink">{a.actualWeightKg}kg</strong>
            </span>
          </li>
        ))}
      </ul>

      {pending && (
        <>
          <p className="text-sm text-ink mb-3">
            New price <strong>{formatPrice(s.proposedPrice)}</strong>{" "}
            <span className="text-inkSoft">(was {formatPrice(s.originalPrice)})</span>. Confirm it, or dispute if the
            weight looks wrong. It auto-confirms if you don't respond.
          </p>
          {error && <div className="mb-2"><ErrorBox>{error}</ErrorBox></div>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary !py-2 !px-4 text-sm" disabled={busy} onClick={() => run(() => confirmSettlement(pickup._id))}>
              {busy ? "Working…" : "Confirm price"}
            </button>
            <button
              type="button"
              className="btn-secondary !py-2 !px-4 text-sm"
              disabled={busy}
              onClick={() => run(() => disputeSettlement(pickup._id, "Weighed amount looks wrong."))}
            >
              Dispute
            </button>
          </div>
        </>
      )}

      {s.status === "disputed" && (
        <p className="text-sm text-inkSoft">Disputed — an admin is reviewing it. The payout is on hold until then.</p>
      )}
      {DONE_LABEL[s.status] && (
        <p className="text-sm text-inkSoft">
          {DONE_LABEL[s.status]} Final price <strong className="text-ink">{formatPrice(s.finalPrice ?? pickup.price)}</strong>.
        </p>
      )}
    </div>
  );
}