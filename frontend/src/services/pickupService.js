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

export const cancelPickup = (id) => API.patch(`/pickup/${id}/cancel`);