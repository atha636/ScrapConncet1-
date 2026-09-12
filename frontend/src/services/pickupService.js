import API from "./api";

export const SCRAP_TYPES = ["metal", "plastic", "paper", "e-waste", "glass", "other"];

// FormData in, because image upload is multipart.
export const createPickup = (formData) =>
  API.post("/pickup/request", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMyRequests = (params = {}) => API.get("/pickup/my-requests", { params });

export const getAvailable = (params = {}) => API.get("/pickup/available", { params });

export const getCollectorJobs = (params = {}) => API.get("/pickup/collector/jobs", { params });

export const acceptPickup = (id) => API.patch(`/pickup/${id}/accept`);

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

export const RECURRING_FREQUENCIES = ["weekly", "biweekly", "monthly"];

export const createRecurring = (data) => API.post("/pickup/recurring", data);

export const getMyRecurring = () => API.get("/pickup/recurring");

export const toggleRecurring = (id) => API.patch(`/pickup/recurring/${id}/toggle`);

export const deleteRecurring = (id) => API.delete(`/pickup/recurring/${id}`);

export const getPickupById = (id) => API.get(`/pickup/${id}`);

export const getLeaderboard = () => API.get("/pickup/collector/leaderboard");

export const getCollectorProfile = (id) => API.get(`/pickup/collector/${id}/profile`);

// Deliberately called with `API` (which always attaches whatever token is
// in localStorage, if any) rather than a bare axios/fetch call — the public
// endpoint itself ignores that header either way (no `auth` middleware on
// it), so this works identically for a logged-out visitor and a logged-in
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

export const cancelPickup = (id) => API.patch(`/pickup/${id}/cancel`);

export const exportMyRequests = () => API.get("/export/my-requests", { responseType: "blob" });