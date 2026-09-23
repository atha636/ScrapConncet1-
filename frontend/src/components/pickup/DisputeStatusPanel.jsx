import { useEffect, useState } from "react";
import { getPickupDisputes } from "../../services/pickupService";

const REASON_LABELS = {
  no_show: "Never showed up",
  wrong_weight_or_price: "Weight or price disagreement",
  damaged_property: "Property damaged",
  unsafe_or_rude_behavior: "Unsafe or rude behavior",
  payment_issue: "Payment issue",
  other: "Other",
};

const STATUS_STYLE = {
  open: { label: "Under review", bg: "bg-amber/15", fg: "text-amber-dark" },
  resolved: { label: "Resolved", bg: "bg-rust/10", fg: "text-rust" },
  dismissed: { label: "Dismissed", bg: "bg-inkSoft/10", fg: "text-inkSoft" },
};

/**
 * Surfaces what actually happened to a report after it was filed — until
 * now, createDispute returned the fresh document once and neither party
 * ever heard anything again unless they were admin. A real (if short)
 * timeline: filed → under review → resolved/dismissed, with the admin's
 * resolution notes once there are any, instead of a submitted flag that
 * never changes.
 *
 * Fetches lazily on mount rather than being handed disputes as a prop —
 * RequestDetailModal only mounts this once a pickup has a collector
 * (disputes are impossible before that), and most pickups never have
 * one filed at all, so this stays a no-op render for the common case.
 */
export default function DisputeStatusPanel({ pickupId }) {
  const [disputes, setDisputes] = useState(null);

  useEffect(() => {
    if (!pickupId) return;
    let cancelled = false;
    getPickupDisputes(pickupId)
      .then((res) => {
        if (!cancelled) setDisputes(res.data);
      })
      .catch(() => {
        // Best-effort — a failed fetch here just means the panel stays
        // hidden, same as if nothing had ever been filed. Nothing about
        // filing a new report or the rest of the modal depends on this.
        if (!cancelled) setDisputes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pickupId]);

  if (!disputes || disputes.length === 0) return null;

  return (
    <div className="mt-4 space-y-2.5">
      <h4 className="text-xs font-semibold text-inkFaint uppercase tracking-wide">
        {disputes.length > 1 ? "Reports on this pickup" : "Report status"}
      </h4>
      {disputes.map((d) => {
        const style = STATUS_STYLE[d.status] || STATUS_STYLE.open;
        return (
          <div key={d._id} className="rounded-ticket border border-line px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-ink">
                {REASON_LABELS[d.reason] || d.reason}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.fg}`}>
                {style.label}
              </span>
            </div>
            <p className="text-[11px] text-inkFaint">
              Filed {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              {d.reportedBy?.name ? ` by ${d.reportedBy.name}` : ""}
            </p>
            {d.status !== "open" && d.resolutionNotes && (
              <p className="text-xs text-inkSoft mt-2 leading-snug border-t border-line pt-2">
                {d.resolutionNotes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}