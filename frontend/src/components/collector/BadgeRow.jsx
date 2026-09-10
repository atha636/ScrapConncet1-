/**
 * Renders a collector's earned badges (see backend's badges.js — purely
 * derived from stats already on the profile payload, nothing badge-specific
 * to fetch separately). Shared between CollectorProfileCard and
 * PublicProfile so both surfaces render badges identically.
 */
export default function BadgeRow({ badges, size = "sm" }) {
  if (!badges?.length) return null;

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={`inline-flex items-center gap-1 ${padding} bg-rust/[0.06] border border-rust/15 rounded-full font-medium text-inkSoft`}
          title={badge.label}
        >
          <span className="leading-none">{badge.icon}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}