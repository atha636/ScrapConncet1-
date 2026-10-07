import API from "./api";

// params: { action, from, to, page, limit }
export const getAuditLogs = (params = {}) => API.get("/admin/audit-logs", { params });