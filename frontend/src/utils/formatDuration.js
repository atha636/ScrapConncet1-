/**
 * Formats a duration in minutes for display next to a collector's stats
 * (e.g. "usually accepts within 12 min"). Shared between
 * CollectorProfileCard and the public PublicProfile page so the two
 * surfaces never drift into different wording for the same number.
 */
export function formatAcceptTime(minutes) {
  if (minutes == null) return null;
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
  return `${Math.round(hours / 24)} days`;
}

/** 0.947 -> "95%" — rounds rather than truncates, so a genuine 94.5%+ reads as 95%, not 94%. */
export function formatCompletionRate(rate) {
  if (rate == null) return null;
  return `${Math.round(rate * 100)}%`;
}