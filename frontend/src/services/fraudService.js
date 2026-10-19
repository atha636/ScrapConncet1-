import API from "./api";

// Admin only — fraud watch
export const adminGetFraudFlags = () => API.get("/fraud/flags");
export const adminReviewFraudFlag = (data) => API.post("/fraud/flags/review", data);