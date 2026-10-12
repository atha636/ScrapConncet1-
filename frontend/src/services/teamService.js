import API from "./api";

export const getMyTeam = () => API.get("/teams/mine");
export const createTeam = (name) => API.post("/teams", { name });

// owner
export const inviteMember = (email) => API.post("/teams/members", { email });
export const removeMember = (userId) => API.delete(`/teams/members/${userId}`);
export const setMemberVehicle = (userId, vehicleId) => API.patch(`/teams/members/${userId}/vehicle`, { vehicleId });
export const addVehicle = (data) => API.post("/teams/vehicles", data);
export const removeVehicle = (id) => API.delete(`/teams/vehicles/${id}`);
export const getTeamJobs = () => API.get("/teams/jobs");
export const assignJob = (pickupId, memberId) => API.post("/teams/assign", { pickupId, memberId });
export const getTeamStats = (days = 30) => API.get("/teams/stats", { params: { days } });

// member
export const acceptTeamInvite = (teamId) => API.post(`/teams/invites/${teamId}/accept`);
export const declineTeamInvite = (teamId) => API.post(`/teams/invites/${teamId}/decline`);
export const leaveTeam = () => API.post("/teams/leave");