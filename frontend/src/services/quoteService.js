import API from "./api";

// Users
export const getItemCatalog = () => API.get("/quotes/catalog");

// body: { materials: [{scrapType, weightKg}], countItems: [{key, qty}], lat, lng }
export const compareQuotes = (body) => API.post("/quotes/compare", body);

// Collectors — their own per-kg rates
export const getRateCard = () => API.get("/quotes/rate-card");
export const saveRateCard = (rates) => API.put("/quotes/rate-card", { rates });

// Admin — countable-item catalog
export const getCatalogAdmin = () => API.get("/quotes/catalog/all");
export const updateCatalogItem = (key, body) => API.put(`/quotes/catalog/${key}`, body);