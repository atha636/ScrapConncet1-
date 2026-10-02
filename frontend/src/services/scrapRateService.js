import API from "./api";

export const getScrapRates = () => API.get("/scrap-rates");

export const updateScrapRate = (scrapType, ratePerKg) =>
  API.put(`/scrap-rates/${scrapType}`, { ratePerKg });