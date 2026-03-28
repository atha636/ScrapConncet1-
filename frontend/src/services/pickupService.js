import API from "./api";

export const createPickup = (data) =>
  API.post("/pickup/request", data);

export const getMyRequests = () =>
  API.get("/pickup/my-requests");

export const getAvailable = () =>
  API.get("/pickup/available");

export const acceptPickup = (id) =>
  API.patch(`/pickup/${id}/accept`);

export const updateStatus = (id, status) =>
  API.patch(`/pickup/${id}/status`, { status });