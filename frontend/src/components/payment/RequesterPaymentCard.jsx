import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorBox from "../common/ErrorBox";
import { getPickupPayment, confirmReceived, disputePayment } from "../../services/paymentService";
import { formatPrice } from "../../utils/formatPrice";

/**
 * Requester side of a completed pickup: shows what the collector says they
 * paid, and lets the requester confirm it arrived or say it didn't.
 */
export default function RequesterPaymentCard({ pickup }) {
  const [pay, setPay] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState("");

  const live = !!pickup && pickup.status === "completed" && !!pickup.collector;
  const pickupId = pickup?._id;
  const stamp = `${pickup?.payment?.status}|${pickup?.price}|${pickup?.settlement?.status}`;

  useEffect(() => {
    if (!live) return;
    let alive = true;
    getPickupPayment(pickupId)
      .then((res) => alive && setPay(res.data))
      .catch(() => alive && setPay({ failed: true }));
    return () => { alive = false; };
  }, [live, pickupId, stamp]);

  if (!live || !pay || pay.failed || !pay.payable) return null;

  const amount = formatPrice(pay.amount);
  const box = "rounded-md border border-line bg-surfaceRaised p-3.5";

  const run = async (kind, fn) => {
    setBusy(kind);
    setError("");
    try {
      const res = await fn();
      setPay((p) => ({ ...p, ...res.data }));
      setDisputing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setBusy("");
    }
  };

  if (pay.status === "confirmed") {
    return (
      <div className={`${box} border-rust/30`}>
        <p className="text-sm font-semibold text-rust">✓ Payment received — {amount}</p>
      </div>
    );
  }
  if (pay.status === "resolved") {
    return (
      <div className={box}>
        <p className="text-sm font-semibold text-ink">Payment settled by an admin</p>
      </div>
    );
  }
  if (pay.status === "disputed") {
    return (
      <div className={`${box} border-danger/40`}>
        <p className="text-sm font-semibold text-danger">You reported the payment as not received</p>
        <p className="text-xs text-inkSoft mt-0.5">An admin is reviewing it and will update you.</p>
      </div>
    );
  }
  if (pay.status === "claimed") {
    return (
      <div className={box}>
        <p className="text-sm font-semibold text-ink">Did you receive {amount}?</p>
        <p className="text-xs text-inkSoft mt-0.5 mb-3">
          Your collector says they paid {pay.method === "cash" ? "in cash" : "by UPI"}
          {pay.upiRef ? ` (ref ${pay.upiRef})` : ""}. Check your {pay.method === "cash" ? "cash" : "UPI app or bank"} before confirming.
        </p>
        {error && <div className="mb-2"><ErrorBox>{error}</ErrorBox></div>}
        {disputing ? (
          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Optional: what happened?"
              className="field-input text-sm mb-2.5"
            />
            <div className="flex items-center gap-3">
              <button type="button" disabled={!!busy} onClick={() => run("dispute", () => disputePayment(pickupId, note.trim()))} className="btn-primary !py-2 !px-4 text-sm !bg-danger disabled:opacity-50">
                {busy === "dispute" ? "Sending…" : "Report not received"}
              </button>
              <button type="button" onClick={() => setDisputing(false)} className="text-sm font-semibold text-inkSoft hover:text-ink">Back</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" disabled={!!busy} onClick={() => run("confirm", () => confirmReceived(pickupId))} className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50">
              {busy === "confirm" ? "Confirming…" : "Yes, received"}
            </button>
            <button type="button" onClick={() => setDisputing(true)} className="text-sm font-semibold text-inkSoft hover:text-danger">Not received</button>
          </div>
        )}
      </div>
    );
  }

  // unpaid
  return (
    <div className={box}>
      <p className="text-sm font-semibold text-ink">Payment: {amount}</p>
      <p className="text-xs text-inkSoft mt-0.5">Waiting for your collector to pay you.</p>
      {pay.hasUpi === false && (
        <p className="text-xs text-inkSoft mt-2">
          Want it by UPI? <Link to="/profile" className="font-semibold text-rust hover:underline">Add your UPI ID</Link> so they can pay in one tap.
        </p>
      )}
    </div>
  );
}