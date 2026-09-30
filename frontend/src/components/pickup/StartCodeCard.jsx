import { useEffect, useState } from "react";
import { getPickupById } from "../../services/pickupService";

/**
 * Requester side of the start handshake. The code is derived server-side
 * and only returned to the requester by GET /pickup/:id — it is never part
 * of the socket "updatePickup" payload, so this fetches it itself instead
 * of reading it off the pickup prop.
 */
export default function StartCodeCard({ pickup }) {
  const [code, setCode] = useState(null);
  const pickupId = pickup?._id;
  const status = pickup?.status;
  // A different collector means a different code, so refetch when it changes.
  const collectorId = pickup?.collector?._id || pickup?.collector;

  useEffect(() => {
    if (!pickupId || status !== "accepted") return;
    let cancelled = false;
    getPickupById(pickupId)
      .then((res) => {
        if (!cancelled) setCode(res.data.handshakeOtp || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pickupId, status, collectorId]);

  if (!pickup || pickup.status !== "accepted" || !code) return null;

  return (
    <div className="mt-4 rounded-md border border-rust/30 bg-rust/5 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-inkSoft">Your start code</p>
      <p className="my-1 text-3xl font-bold tracking-[0.4em] text-ink" aria-label={`Start code ${code.split("").join(" ")}`}>
        {code}
      </p>
      <p className="text-xs text-inkSoft">
        Tell this to the collector when they arrive. The pickup can't start without it — don't share it beforehand.
      </p>
    </div>
  );
}