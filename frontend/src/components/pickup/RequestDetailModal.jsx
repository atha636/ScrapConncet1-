import StatusStamp from "../ui/StatusStamp";
import { formatPrice } from "../../utils/formatPrice";

export default function RequestDetailModal({
  pickup,
  open,
  onClose,
  onChat,
  onCancel,
  onRate,
  cancelling,
  alreadyRated,
}) {
  if (!open || !pickup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="ticket w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised shrink-0">
          <div className="font-display font-semibold text-ink text-sm">Request details</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-inkFaint hover:text-rust hover:bg-rust/[0.06] transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {pickup.image && (
            <img
              src={pickup.image}
              alt={pickup.scrapType}
              className="w-full h-48 object-cover rounded-md border border-line mb-4"
            />
          )}

          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-xl font-bold text-ink capitalize">{pickup.scrapType}</h2>
            <StatusStamp status={pickup.status} />
          </div>
          {pickup.estimatedWeightKg && (
            <p className="text-sm text-inkSoft mb-4">Approx. {pickup.estimatedWeightKg}kg</p>
          )}

          <div className="border-t border-dashed border-line my-4" />

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-inkFaint">Reference</dt>
              <dd className="font-mono text-ink">#{pickup._id.slice(-6).toUpperCase()}</dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-inkFaint">Price</dt>
              <dd className="font-mono font-semibold text-ink text-base">{formatPrice(pickup.price)}</dd>
            </div>

            {pickup.location && (
              <div className="flex items-start justify-between gap-4">
                <dt className="text-inkFaint shrink-0">Location</dt>
                <dd className="text-ink text-right">
                  {pickup.location.address ||
                    `${pickup.location.lat.toFixed(3)}, ${pickup.location.lng.toFixed(3)}`}
                </dd>
              </div>
            )}

            {pickup.collector?.name && (
              <div className="flex items-center justify-between">
                <dt className="text-inkFaint">Collector</dt>
                <dd className="text-ink font-medium">{pickup.collector.name}</dd>
              </div>
            )}
            {pickup.collector?.phone && (
              <div className="flex items-center justify-between">
                <dt className="text-inkFaint">Contact</dt>
                <dd className="text-ink font-mono">{pickup.collector.phone}</dd>
              </div>
            )}

            {pickup.createdAt && (
              <div className="flex items-center justify-between">
                <dt className="text-inkFaint">Requested</dt>
                <dd className="text-ink">
                  {new Date(pickup.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="px-5 py-4 border-t border-line bg-surfaceRaised shrink-0 flex flex-wrap justify-end gap-2.5">
          <button onClick={onClose} className="btn-secondary !py-2 !px-4 text-sm">
            Close
          </button>

          {["pending", "accepted"].includes(pickup.status) && (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="text-sm font-semibold text-danger hover:underline px-2"
            >
              {cancelling ? "Cancelling…" : "Cancel request"}
            </button>
          )}

          {pickup.collector && pickup.status !== "cancelled" && (
            <button onClick={onChat} className="btn-secondary !py-2 !px-4 text-sm">
              Chat
            </button>
          )}

          {pickup.status === "completed" && pickup.collector && !alreadyRated && (
            <button onClick={onRate} className="btn-primary !py-2 !px-4 text-sm">
              Rate collector
            </button>
          )}
        </div>
      </div>
    </div>
  );
}