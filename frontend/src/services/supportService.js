import API from "./api";

// Requester (user / collector)
export const createTicket = (data) => API.post("/support/tickets", data);
export const getMyTickets = () => API.get("/support/tickets/mine");
export const getMyTicket = (id) => API.get(`/support/tickets/mine/${id}`);
export const replyToMyTicket = (id, message) => API.post(`/support/tickets/mine/${id}/reply`, { message });

// Admin
export const adminListTickets = (params) => API.get("/support/admin/tickets", { params });
export const adminGetTicket = (id) => API.get(`/support/admin/tickets/${id}`);
export const adminReplyTicket = (id, message) => API.post(`/support/admin/tickets/${id}/reply`, { message });
export const adminSetTicketStatus = (id, status) => API.patch(`/support/admin/tickets/${id}/status`, { status });