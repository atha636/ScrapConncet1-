import API from "./api";

export const loginUser = (data) => API.post("/auth/login", data);

export const googleAuth = (data) => API.post("/auth/google", data);

// Backend expects { name, email, password, phone?, wantsToBeCollector? } —
// role is never sent directly (server decides it).
export const registerUser = (data) => API.post("/auth/register", data);

// Response also includes `hasPassword` — false for a Google-only account,
// used by the Profile page to decide whether the delete-account flow needs
// to ask for a password confirmation.
export const fetchMe = () => API.get("/auth/me");

export const updateProfile = (data) => API.patch("/auth/me", data);

export const changePassword = (data) => API.patch("/auth/change-password", data);

// data: { password?, confirm: "DELETE" } — password is only required for
// accounts that actually have one (see authController.deleteAccount).
export const deleteAccount = (data) => API.delete("/auth/me", { data });

export const verifyEmail = (token) => API.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);

export const resendVerification = () => API.post("/auth/resend-verification");

export const forgotPassword = (email) => API.post("/auth/forgot-password", { email });

export const resetPassword = (token, newPassword) =>
  API.post("/auth/reset-password", { token, newPassword });