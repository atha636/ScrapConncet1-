import PickupMap from "./PickupMap";

export default function MapModal({ open, onClose, lat, lng, label, address }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="ticket w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surfaceRaised">
          <div>
            <div className="font-display font-semibold text-ink text-sm">Pickup location</div>
            {address && <div className="text-xs text-inkFaint mt-0.5">{address}</div>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-inkFaint hover:text-rust hover:bg-rust/[0.06] transition-colors"
            aria-label="Close map"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <PickupMap lat={lat} lng={lng} label={label} height={320} />
      </div>
    </div>
  );
}