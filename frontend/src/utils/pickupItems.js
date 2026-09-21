export const SCRAP_TYPE_LABELS = {
  metal: "Metal",
  plastic: "Plastic",
  paper: "Paper",
  "e-waste": "E-waste",
  glass: "Glass",
  other: "Other",
};

// A pickup created before multi-item support shipped (or spawned by the
// recurring-pickup job, which still only sets scrapType/estimatedWeightKg
// directly) has no `items` array yet — the backend's pre-save hook only
// synthesizes one the next time that document is actually saved. Every
// display component reads through this instead of `pickup.items` directly
// so both old and new pickups render the same way with no migration
// script needed.
export function getPickupItems(pickup) {
  if (!pickup) return [];
  if (pickup.items && pickup.items.length > 0) return pickup.items;
  if (pickup.scrapType) return [{ scrapType: pickup.scrapType, estimatedWeightKg: pickup.estimatedWeightKg }];
  return [];
}

// Short label for list rows / card headlines — "Metal", "Metal + 2 more"
// — rather than spelling out every item where space is tight. Use
// getPickupItems(pickup) directly (see PickupDetailModal/RequestDetailModal)
// wherever the full breakdown should actually be shown.
export function formatItemsLabel(items) {
  if (!items || items.length === 0) return "—";
  const first = SCRAP_TYPE_LABELS[items[0].scrapType] || items[0].scrapType;
  if (items.length === 1) return first;
  return `${first} + ${items.length - 1} more`;
}

// "10kg" style summary for a whole item list, or a single item's own
// weight when only one is provided — omitted entirely (returns null)
// when there's nothing to show, since "Approx. 0kg" reads as a real
// answer rather than "not provided."
export function formatTotalWeight(items) {
  if (!items || items.length === 0) return null;
  const total = items.reduce((sum, it) => sum + (Number(it.estimatedWeightKg) || 0), 0);
  return total > 0 ? `${total}kg` : null;
}