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

export const updateStatus = (id, status) => API.patch(`/pickup/${id}/status`, { status });

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

export const cancelPickup = (id) => API.patch(`/pickup/${id}/cancel`);

export const exportMyRequests = () => API.get("/export/my-requests", { responseType: "blob" });