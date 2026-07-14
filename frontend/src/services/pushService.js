import API from "./api";

export const getVapidPublicKey = () => API.get("/push/vapid-public-key");

export const subscribeToPush = (subscription) => API.post("/push/subscribe", subscription);

export const unsubscribeFromPush = (endpoint) => API.post("/push/unsubscribe", { endpoint });