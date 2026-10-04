import API from "./api";

// Collector
export const getMyVerification = () => API.get("/verification/me");

export const submitVerification = ({ idType, idLast4, file }) => {
  const form = new FormData();
  form.append("idType", idType);
  form.append("idLast4", idLast4);
  form.append("document", file);
  return API.post("/verification/submit", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Admin
export const getVerifications = (status = "pending") => API.get("/verification/admin", { params: { status } });

export const getVerificationDocument = (collectorId) =>
  API.get(`/verification/admin/${collectorId}/document`, { responseType: "blob" });

export const reviewVerification = (collectorId, decision, reason) =>
  API.patch(`/verification/admin/${collectorId}/review`, { decision, reason });