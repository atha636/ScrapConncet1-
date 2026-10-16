import { useEffect, useState } from "react";
import ErrorBox from "../common/ErrorBox";
import { getPickupPayment, claimPaid } from "../../services/paymentService";
import { formatPrice } from "../../utils/formatPrice";
import { maskUpi } from "../../utils/payoutMask";

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

function QrCode({ uri }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((QR) => QR.toDataURL(uri, { width: 220, margin: 1 }))
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(""));
    return () => { alive = false; };
  }, [uri]);
  if (!src) return <div className="w-[220px] h-[220px] rounded-md border border-line bg-surface animate-pulse" />;
  return <img src={src} alt="UPI payment QR code" width="220" height="220" className="rounded-md border border-line bg-white" />;
}

/**
 * Collector side of a completed pickup: pay the requester by UPI (one tap on
 * a phone, QR on a laptop) or cash, then mark it as paid. The requester
 * confirms receipt. Shown inside the pickup detail modal.
 */
export default function CollectorPayCard({ pickup }) {
  const [pay, setPay] = useState(null);
  const [showQr, setShowQr] = useState(() => !isMobileDevice());
  const [method, setMethod] = useState("upi");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const live = !!pickup && pickup.status === "completed";
  const pickupId = pickup?._id;
  // Refetch when anything that changes the state changes (socket updates the pickup).
  const stamp = `${pickup?.payment?.status}|${pickup?.price}|${pickup?.settlement?.status}`;

  useEffect(() => {
    if (!live) return;
    let alive = true;
    getPickupPayment(pickupId)
      .then((res) => alive && setPay(res.data))
      .catch(() => alive && setPay({ failed: true }));
    return () => { alive = false; };
  }, [live, pickupId, stamp]);

  if (!live || !pay) return null;
  if (pay.failed) return null;

  const amount = formatPrice(pay.amount);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await claimPaid(pickupId, { method, ...(method === "upi" && ref.trim() ? { upiRef: ref.trim() } : {}) });
      setPay((p) => ({ ...p, ...res.data }));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't record the payment. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(pay.upi.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard can be blocked — the masked ID is not a substitute, so just stay silent */
    }
  };

  const box = "rounded-md border border-line bg-surfaceRaised p-3.5";

  if (!pay.payable) {
    return (
      <div className={box}>
        <p className="text-sm font-semibold text-ink">Payment</p>
        <p className="text-xs text-inkSoft mt-0.5">Payment opens once the final amount is settled with the requester.</p>
      </div>
    );
  }
  if (pay.status === "confirmed") {
    return (
      <div className={`${box} border-rust/30`}>
        <p className="text-sm font-semibold text-rust">✓ Paid and confirmed — {amount}</p>
        <p className="text-xs text-inkSoft mt-0.5">The requester confirmed they received it{pay.method === "cash" ? " (cash)" : " by UPI"}.</p>
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
        <p className="text-sm font-semibold text-danger">Requester says the payment wasn't received</p>
        <p className="text-xs text-inkSoft mt-0.5">An admin is reviewing it. Keep your UPI reference handy{pay.upiRef ? ` (${pay.upiRef})` : ""}.</p>
      </div>
    );
  }
  if (pay.status === "claimed") {
    return (
      <div className={box}>
        <p className="text-sm font-semibold text-ink">Waiting for the requester to confirm</p>
        <p className="text-xs text-inkSoft mt-0.5">
          You marked {amount} as paid {pay.method === "cash" ? "in cash" : "by UPI"}{pay.upiRef ? ` (ref ${pay.upiRef})` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className={box}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p className="text-sm font-semibold text-ink">Pay the requester</p>
        <p className="font-display text-xl font-bold text-rust">{amount}</p>
      </div>

      {pay.upi ? (
        <>
          <p className="text-xs text-inkSoft mb-3">
            To <span className="font-semibold text-ink">{pay.upi.payeeName}</span> ·{" "}
            <span className="font-mono">{maskUpi(pay.upi.upiId)}</span>{" "}
            <button type="button" onClick={copyId} className="text-rust font-semibold hover:underline">{copied ? "Copied" : "Copy ID"}</button>
          </p>

          {isMobileDevice() && (
            <a href={pay.upi.uri} className="btn-primary !py-2.5 text-sm w-full text-center block mb-2">
              Pay {amount} with UPI
            </a>
          )}
          {isMobileDevice() && (
            <button type="button" onClick={() => setShowQr((v) => !v)} className="text-xs font-semibold text-inkSoft hover:text-ink mb-2">
              {showQr ? "Hide QR code" : "Show QR code instead"}
            </button>
          )}
          {showQr && (
            <div className="flex flex-col items-center gap-1.5 mb-3">
              <QrCode uri={pay.upi.uri} />
              <p className="text-[11px] text-inkFaint text-center">Scan with any UPI app — the amount is filled in for you.</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-inkSoft mb-3">
          The requester hasn't added a UPI ID yet. Ask them in chat to add one in their profile, or pay in cash.
        </p>
      )}

      <div className="border-t border-dashed border-line pt-3">
        <p className="text-xs font-semibold text-ink mb-2">After you've paid</p>
        <div className="flex gap-2 mb-2.5">
          {[["upi", "Paid by UPI"], ["cash", "Paid in cash"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMethod(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${method === key ? "bg-rust text-surface border-rust" : "border-line text-inkSoft hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {method === "upi" && (
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="UPI reference / UTR (optional)"
            autoCapitalize="characters"
            className="field-input text-sm mb-2.5"
          />
        )}
        {error && <div className="mb-2"><ErrorBox>{error}</ErrorBox></div>}
        <button type="button" onClick={submit} disabled={busy} className="btn-secondary !py-2 text-sm w-full disabled:opacity-50">
          {busy ? "Saving…" : "I've paid"}
        </button>
        <p className="text-[11px] text-inkFaint mt-2">The app can't see UPI payments — the requester confirms when the money arrives.</p>
      </div>
    </div>
  );
}