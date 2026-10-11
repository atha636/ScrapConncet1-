import API from "./api";

// Requester: check a code while filling the pickup form
export const validateCoupon = (code, estimatedPrice) => API.post("/coupons/validate", { code, estimatedPrice });

// Admin
export const listCoupons = () => API.get("/coupons/admin");
export const createCoupon = (data) => API.post("/coupons/admin", data);
export const updateCoupon = (id, data) => API.patch(`/coupons/admin/${id}`, data);