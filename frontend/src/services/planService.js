import API from "./api";

// Collector
export const getPlans = () => API.get("/plans");
export const subscribeToPlan = (planKey) => API.post("/plans/subscribe", { planKey });

// Admin
export const getPlansOverview = () => API.get("/plans/admin");
export const savePlanSettings = (data) => API.put("/plans/admin/settings", data);
export const grantPlan = (data) => API.post("/plans/admin/grant", data);