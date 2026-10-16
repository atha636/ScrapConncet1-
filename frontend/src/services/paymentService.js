import API from "./api";

// Requester's own UPI ID
export const getMyUpi = () => API.get("/payments/upi-id");
export const saveMyUpi = (upiId) => API.put("/payments/upi-id", { upiId });
export const clearMyUpi = () => API.delete("/payments/upi-id");

// Per-pickup payment
export const getPickupPayment = (pickupId) => API.get(`/payments/pickups/${pickupId}`);
export const claimPaid = (pickupId, data) => API.post(`/payments/pickups/${pickupId}/claim`, data);
export const confirmReceived = (pickupId) => API.post(`/payments/pickups/${pickupId}/confirm`);
export const disputePayment = (pickupId, description) =>
  API.post(`/payments/pickups/${pickupId}/dispute`, description ? { description } : {});