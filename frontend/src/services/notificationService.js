import API from "./api";

export const getNotifications = (params = {}) => API.get("/notifications", { params });

export const markNotificationRead = (id) => API.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => API.patch("/notifications/read-all");