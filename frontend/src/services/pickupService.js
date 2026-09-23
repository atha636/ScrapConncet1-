import API from "./api";

export const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

// Mirrors Backend/src/validators/pickupValidator.js's MAX_ITEMS_PER_PICKUP —
// kept here rather than fetched from the server since it only changes
// when the backend validator does, and duplicating one constant is
// simpler than a round trip just to render an "Add item" button's
// disabled state.
export const MAX_ITEMS_PER_PICKUP = 8;

// Mirrors Backend/src/utils/pricing.js's BASE_RATE_PER_KG and MIN_PRICE —
// same reasoning as MAX_ITEMS_PER_PICKUP above: this only changes when
// the backend pricing table does, and the whole point of a live estimate
// is that it updates on every keystroke with no debounce or round trip.
// The actual price charged always comes from the server's own
// estimateItemsPrice at submit time (see createPickup) — this is a
// preview, never the source of truth, so a rate changing server-side
// between visits just means the next page load picks up the new numbers.
export const BASE_RATE_PER_KG = {
  metal: 50,
  plastic: 20,
  paper: 10,
  "e-waste": 80,
  glass: 8,
  other: 5,
};
const MIN_ITEM_PRICE = 5;

// Same per-item floor logic as estimateItemsPrice/estimatePrice on the
// backend — one MIN_ITEM_PRICE floor per item, not one for the whole
// load, so a small item tucked into an otherwise large mixed load still
// prices fairly instead of rounding to nothing. `items` here is the
// frontend's own shape ({ scrapType, weight }), not the backend's
// ({ scrapType, estimatedWeightKg }).
export function estimateItemsPrice(items) {
  return items.reduce((total, item) => {
    const rate = BASE_RATE_PER_KG[item.scrapType] ?? BASE_RATE_PER_KG.other;
    const weight = Number(item.weight) > 0 ? Number(item.weight) : 1;
    return total + Math.max(MIN_ITEM_PRICE, Math.round(rate * weight));
  }, 0);
}

// FormData in, because image upload is multipart.
export const createPickup = (formData) =>
  API.post("/pickup/request", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMyRequests = (params = {}) => API.get("/pickup/my-requests", { params });

export const getAvailable = (params = {}) => API.get("/pickup/available", { params });

export const getCollectorJobs = (params = {}) => API.get("/pickup/collector/jobs", { params });

export const acceptPickup = (id) => API.patch(`/pickup/${id}/accept`);

// Accepts several pending pickups in one request — see RoutePlanner's
// sibling feature (both live in the collector Dashboard's job-browsing
// flow). Partial success: check response.data.failed for any that were
// already taken by someone else between selection and submit.
export const batchAcceptPickups = (ids) => API.patch(`/pickup/collector/batch-accept`, { ids });

export const getMyAvailability = () => API.get(`/pickup/collector/availability`);
export const updateMyAvailability = (payload) => API.patch(`/pickup/collector/availability`, payload);

// `photoFile` is only meaningful (and required by the backend) when
// `status` is "completed" — every other transition still sends a plain
// JSON body exactly as before.
export const updateStatus = (id, status, photoFile) => {
  if (!photoFile) {
    return API.patch(`/pickup/${id}/status`, { status });
  }
  const form = new FormData();
  form.append("status", status);
  form.append("photo", photoFile);
  return API.patch(`/pickup/${id}/status`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const DISPUTE_REASONS = [
  "no_show",
  "wrong_weight_or_price",
  "damaged_property",
  "unsafe_or_rude_behavior",
  "payment_issue",
  "other",
];

export const createDispute = (pickupId, data) => API.post(`/pickup/${pickupId}/dispute`, data);

// Read side — either party checks what's happened to a report they filed
// or were named in (open → resolved/dismissed, plus admin's resolution
// notes once there are any), rather than never hearing back after filing.
export const getPickupDisputes = (pickupId) => API.get(`/pickup/${pickupId}/disputes`);

export const RECURRING_FREQUENCIES = ["weekly", "biweekly", "monthly"];

export const createRecurring = (data) => API.post("/pickup/recurring", data);

export const getMyRecurring = () => API.get("/pickup/recurring");

export const toggleRecurring = (id) => API.patch(`/pickup/recurring/${id}/toggle`);

export const deleteRecurring = (id) => API.delete(`/pickup/recurring/${id}`);

export const getPickupById = (id) => API.get(`/pickup/${id}`);

export const getLeaderboard = () => API.get("/pickup/collector/leaderboard");

export const getCollectorProfile = (id) => API.get(`/pickup/collector/${id}/profile`);

// one previewing their own share link.
export const getPublicCollectorProfile = (id) => API.get(`/pickup/collector/${id}/profile/public`);

// No auth needed (see the backend route) — used by both the authenticated
// CollectorProfileCard's "See all reviews" link and the public share page,
// which is exactly why it's called with plain, unauthenticated semantics
// even when a token happens to be attached.
export const getCollectorReviews = (id, page = 1, limit = 10) =>
  API.get(`/pickup/collector/${id}/reviews`, { params: { page, limit } });

// The mirror of getCollectorProfile — what a collector sees about a
// requester (see Dashboard's "Requested by X" line on available jobs).
export const getRequesterProfile = (id) => API.get(`/pickup/requester/${id}/profile`);

// The collector's own locked/unlocked badge catalog with progress — see
// backend's getMyAchievements, self-only (no id param needed or accepted).
export const getMyAchievements = () => API.get(`/pickup/collector/achievements`);

// Orders the collector's active jobs into an efficient visiting sequence
// from their current position. Coordinates are required (the backend 400s
// without them) — see RoutePlanner for where they're obtained.
export const getCollectorRoute = (lat, lng) =>
  API.get(`/pickup/collector/route`, { params: { lat, lng } });

// Suggests a tight cluster of nearby *pending* pickups (not yet accepted
// by anyone) that this collector could take in one trip — the frontend
// preselects them and reuses the normal batch-accept flow, it never
// accepts anything on its own.
export const getSuggestedBatch = (lat, lng, radiusKm) =>
  API.get(`/pickup/collector/suggested-batch`, { params: { lat, lng, radiusKm } });

// The requester-side mirror of getMyAchievements — self-only, no id param.
// Used by Profile.jsx's "My Reputation" card, shown to requesters only.
export const getMyReputation = () => API.get(`/pickup/requester/me/reputation`);

export const cancelPickup = (id) => API.patch(`/pickup/${id}/cancel`);

export const exportMyRequests = () => API.get("/export/my-requests", { responseType: "blob" });

// Price negotiation — proposeOffer opens/reopens a negotiation (collector
// only), respondToOffer is used by either side to accept, decline, or
// counter whichever offer is currently theirs to respond to. `amount`/
// `note` are only meaningful (and required by the backend) when
// action === "counter" — accept/decline ignore them if passed.
export const proposeOffer = (id, amount, note) => API.post(`/pickup/${id}/offer`, { amount, note });

export const respondToOffer = (id, action, amount, note) =>
  API.patch(`/pickup/${id}/offer`, { action, amount, note });