import API from "./api";

export const getRatings = (pickupId) => API.get(`/pickup/${pickupId}/rating`);

export const submitRating = (pickupId, data) => API.post(`/pickup/${pickupId}/rating`, data);