import API from "./api";

export const getReceipt = (pickupId) => API.get(`/pickup/${pickupId}/receipt`);