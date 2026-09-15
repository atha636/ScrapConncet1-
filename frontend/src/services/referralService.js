import API from "./api";

// The signed-in user's own code, referral list, and total reward earned.
export const getMyReferrals = () => API.get("/referrals/me");

// No auth required — backs the "invited by X" preview on the registration
// page, where the visitor doesn't have an account yet.
export const validateReferralCode = (code) => API.get(`/referrals/validate/${code}`);