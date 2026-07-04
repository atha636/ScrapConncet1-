import API from "./api";

export const loginUser = (data) => API.post("/auth/login", data);

// Backend expects { name, email, password, phone?, wantsToBeCollector? } —
// role is never sent directly (server decides it).
export const registerUser = (data) => API.post("/auth/register", data);

export const fetchMe = () => API.get("/auth/me");