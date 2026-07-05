import API from "./api";

export const getAdminStats = () => API.get("/admin/stats");

export const getAdminUsers = (params = {}) => API.get("/admin/users", { params });

export const deactivateUser = (id) => API.patch(`/admin/users/${id}/deactivate`);

export const activateUser = (id) => API.patch(`/admin/users/${id}/activate`);

export const getAllPickups = (params = {}) => API.get("/admin/pickups", { params });