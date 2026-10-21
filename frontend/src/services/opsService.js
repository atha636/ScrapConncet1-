import API from "./api";

// Admin only — live "what needs attention" summary
export const adminGetOps = () => API.get("/admin/ops");