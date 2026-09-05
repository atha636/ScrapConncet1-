import { latLngToTile, tileUrl } from "../../utils/staticMapTile";


export default function MapThumbnail({ lat, lng, size = 64, zoom = 15, onClick, className = "" }) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const { x, y, z, pinXPercent, pinYPercent } = latLngToTile(lat, lng, zoom);

  const content = (
    <>
      <img
        src={tileUrl(x, y, z)}
        alt=""
        loading="lazy"
        className={`w-full h-full object-cover ${onClick ? "transition-transform group-hover:scale-105" : ""}`}
      />
      <div
        className="absolute w-2.5 h-2.5 rounded-full bg-rust border-2 border-surface shadow-sm pointer-events-none"
        style={{ left: `${pinXPercent}%`, top: `${pinYPercent}%`, transform: "translate(-50%, -50%)" }}
      />
    </>
  );

  const sharedClassName = `relative shrink-0 rounded-md overflow-hidden border border-line bg-surfaceRaised ${
    onClick ? "group" : ""
  } ${className}`;

  // Only a real button when it actually does something on click — a
  // hover-scale, cursor-pointer thumbnail that doesn't respond to a tap is
  // a dead click target that reads as a bug, not a static preview image.
  if (!onClick) {
    return (
      <div style={{ width: size, height: size }} className={sharedClassName} aria-label="Pickup location preview">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="View on map"
      style={{ width: size, height: size }}
      className={sharedClassName}
    >
      {content}
    </button>
  );
}