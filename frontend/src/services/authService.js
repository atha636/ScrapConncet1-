import API from "./api";

export const loginUser = (data) => API.post("/auth/login", data);

export const googleAuth = (data) => API.post("/auth/google", data);

// Backend expects { name, email, password, phone?, wantsToBeCollector? } —
// role is never sent directly (server decides it).
export const registerUser = (data) => API.post("/auth/register", data);

export const fetchMe = () => API.get("/auth/me");

export const updateProfile = (data) => API.patch("/auth/me", data);

export const changePassword = (data) => API.patch("/auth/change-password", data);

export const verifyEmail = (token) => API.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);

export const resendVerification = () => API.post("/auth/resend-verification");

export const forgotPassword = (email) => API.post("/auth/forgot-password", { email });

export const resetPassword = (token, newPassword) =>
  API.post("/auth/reset-password", { token, newPassword });