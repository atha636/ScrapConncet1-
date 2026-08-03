import API from "./api";

export const getAdminStats = () => API.get("/admin/stats");

export const getAdminAnalytics = () => API.get("/admin/analytics");

export const getAdminUsers = (params = {}) => API.get("/admin/users", { params });

export const deactivateUser = (id) => API.patch(`/admin/users/${id}/deactivate`);

export const activateUser = (id) => API.patch(`/admin/users/${id}/activate`);

export const reinstateCollector = (id) => API.patch(`/admin/users/${id}/reinstate`);

export const getPayoutRequests = (params = {}) => API.get("/admin/payouts", { params });

export const approvePayout = (id) => API.patch(`/admin/payouts/${id}/approve`);

export const rejectPayout = (id, note) => API.patch(`/admin/payouts/${id}/reject`, { note });

export const getAllPickups = (params = {}) => API.get("/admin/pickups", { params });

export const exportUsersCsv = () => API.get("/export/admin/users", { responseType: "blob" });

export const exportPickupsCsv = () => API.get("/export/admin/pickups", { responseType: "blob" });