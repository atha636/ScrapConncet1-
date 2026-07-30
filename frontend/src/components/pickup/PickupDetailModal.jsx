import { formatPrice } from "../../utils/formatPrice";
import { formatDistance } from "../../utils/distance";

export default function PickupDetailModal({ pickup, open, onClose, onAccept, onViewMap, accepting, isSuspended }) {
  if (!open || !pickup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="ticket w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised shrink-0">
          <div className="font-display font-semibold text-ink text-sm">Pickup details</div>
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
            {pickup.isUrgent && (
              <span className="text-[10px] uppercase tracking-wide font-bold bg-danger text-surface px-1.5 py-0.5 rounded-ticket">
                Urgent
              </span>
            )}
          </div>
          {pickup.estimatedWeightKg && (
            <p className="text-sm text-inkSoft mb-4">Approx. {pickup.estimatedWeightKg}kg</p>
          )}

          <div className="border-t border-dashed border-line my-4" />

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-inkFaint">Offered price</dt>
              <dd className="font-mono font-semibold text-ink text-base">{formatPrice(pickup.price)}</dd>
            </div>

            <div className="flex items-start justify-between gap-4">
              <dt className="text-inkFaint shrink-0">Location</dt>
              <dd className="text-right">
                <div className="text-ink">
                  {pickup.location?.address ||
                    `${pickup.location.lat.toFixed(3)}, ${pickup.location.lng.toFixed(3)}`}
                </div>
                {pickup.distanceKm !== undefined && (
                  <div className="font-mono text-xs text-amber-dark font-semibold mt-0.5">
                    {formatDistance(pickup.distanceKm)} away
                  </div>
                )}
                <button onClick={onViewMap} className="text-xs text-rust font-semibold hover:underline mt-0.5">
                  View on map
                </button>
              </dd>
            </div>

            {pickup.user?.name && (
              <div className="flex items-center justify-between">
                <dt className="text-inkFaint">Requested by</dt>
                <dd className="text-ink">{pickup.user.name}</dd>
              </div>
            )}
            {pickup.user?.phone && (
              <div className="flex items-center justify-between">
                <dt className="text-inkFaint">Contact</dt>
                <dd className="text-ink font-mono">{pickup.user.phone}</dd>
              </div>
            )}

            {pickup.createdAt && (
              <div className="flex items-center justify-between">
                <dt className="text-inkFaint">Posted</dt>
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

        <div className="px-5 py-4 border-t border-line bg-surfaceRaised shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary !py-2 !px-4 text-sm">
            Close
          </button>
          <button
            onClick={onAccept}
            disabled={accepting || isSuspended}
            title={isSuspended ? "Your account can't accept new pickups right now" : undefined}
            className="btn-primary !py-2 !px-4 text-sm"
          >
            {accepting ? "Accepting…" : "Accept pickup"}
          </button>
        </div>
      </div>
    </div>
  );
}