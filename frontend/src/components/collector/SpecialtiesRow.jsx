import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

/**
 * What a collector has actually spent their time collecting — derived on
 * the backend from completed pickups (see buildCollectorProfile's
 * `specialties`), so it's a track record, not a self-description.
 * Deliberately separate from BadgeRow: badges are milestones and
 * reliability thresholds, this is "what kind of scrap," and a collector
 * with no completed pickups yet simply has nothing to show here.
 */
export default function SpecialtiesRow({ specialties, size = "sm" }) {
  if (!specialties?.length) return null;

  const text = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${text} text-inkSoft`}>
      <span className="text-inkFaint">Most collected:</span>
      {specialties.map((s) => (
        <span key={s.type} className="font-medium">
          {SCRAP_TYPE_LABELS[s.type] || s.type}
          <span className="text-inkFaint font-normal"> ×{s.count}</span>
        </span>
      ))}
    </div>
  );
}