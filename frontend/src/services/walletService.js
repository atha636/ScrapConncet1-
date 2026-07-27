import API from "./api";

export const getWalletSummary = () => API.get("/wallet/summary");

export const getTransactions = (params = {}) => API.get("/wallet/transactions", { params });