import API from "./api";

export const getMyImpact = () => API.get("/impact/me");

// Public — no auth needed (used on the Home page).
export const getCommunityImpact = () => API.get("/impact/community");