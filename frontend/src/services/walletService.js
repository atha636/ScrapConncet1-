import API from "./api";

export const getWalletSummary = () => API.get("/wallet/summary");

export const getEarningsTrend = () => API.get("/wallet/trend");

export const getTransactions = (params = {}) => API.get("/wallet/transactions", { params });

export const requestPayout = (amount) => API.post("/wallet/payout", { amount });

export const getMyPayouts = () => API.get("/wallet/payouts");