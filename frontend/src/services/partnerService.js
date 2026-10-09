import API from "./api";

// Collector / admin: active partners, for the drop-off form
export const listPartners = () => API.get("/partners");

// Admin
export const listAllPartners = () => API.get("/partners/all");
export const createPartner = (body) => API.post("/partners", body);
export const updatePartner = (id, body) => API.put(`/partners/${id}`, body);