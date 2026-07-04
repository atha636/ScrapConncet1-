import API from "./api";

export const getMessages = (pickupId) => API.get(`/pickup/${pickupId}/messages`);

export const sendMessage = (pickupId, text) =>
  API.post(`/pickup/${pickupId}/messages`, { text });