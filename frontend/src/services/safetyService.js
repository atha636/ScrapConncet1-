import API from "./api";

// Requester / collector on a pickup
export const getTripShare = (pickupId) => API.get(`/safety/pickups/${pickupId}/share`);
export const createTripShare = (pickupId) => API.post(`/safety/pickups/${pickupId}/share`);
export const stopTripShare = (pickupId) => API.delete(`/safety/pickups/${pickupId}/share`);
export const raiseSos = (pickupId, data) => API.post(`/safety/pickups/${pickupId}/sos`, data);

// Public — what a shared link opens (no login)
export const getPublicTrip = (token) => API.get(`/safety/public/trip/${token}`);

// Admin
export const adminListSafetyAlerts = (status = "active") => API.get("/safety/admin/alerts", { params: { status } });
export const adminResolveSafetyAlert = (id, note) => API.patch(`/safety/admin/alerts/${id}/resolve`, { note });