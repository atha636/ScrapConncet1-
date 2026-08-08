/**
 * Given the ratings returned for a pickup (GET /pickup/:id/rating) and the
 * current user's id, decides whether *this* user has already rated it.
 *
 * Extracted as a pure function because it's the exact logic that was missing
 * before — the UI trusted local state instead of checking the backend, so
 * "Rate requester" kept showing for pickups that were already rated.
 */
export function hasUserRated(ratings, userId) {
  if (!userId || !Array.isArray(ratings)) return false;
  return ratings.some((r) => String(r.fromUser?._id || r.fromUser) === String(userId));
}