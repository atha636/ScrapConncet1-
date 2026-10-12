import API from "./api";

export const getBusinessProfile = () => API.get("/business/profile");
export const saveBusinessProfile = (data) => API.put("/business/profile", data);
export const getBusinessReport = (month) => API.get("/business/report", { params: { month } });
export const downloadBusinessReportCsv = (month) =>
  API.get("/business/report/csv", { params: { month }, responseType: "blob" });