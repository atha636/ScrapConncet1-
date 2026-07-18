import API from "./api";

export const getAdminStats = () => API.get("/admin/stats");

export const getAdminAnalytics = () => API.get("/admin/analytics");

export const getAdminUsers = (params = {}) => API.get("/admin/users", { params });

export const deactivateUser = (id) => API.patch(`/admin/users/${id}/deactivate`);

export const activateUser = (id) => API.patch(`/admin/users/${id}/activate`);

export const getAllPickups = (params = {}) => API.get("/admin/pickups", { params });

export const exportUsersCsv = () => API.get("/export/admin/users", { responseType: "blob" });

export const exportPickupsCsv = () => API.get("/export/admin/pickups", { responseType: "blob" });