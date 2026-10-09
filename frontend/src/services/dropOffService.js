import API from "./api";

export const getPendingDropOffs = () => API.get("/dropoffs/pending");

// One photo and one partner for a batch of completed pickups.
export const recordDropOff = ({ partnerId, pickupIds, photo }) => {
  const form = new FormData();
  form.append("partnerId", partnerId);
  form.append("pickupIds", JSON.stringify(pickupIds));
  form.append("photo", photo);
  return API.post("/dropoffs", form, { headers: { "Content-Type": "multipart/form-data" } });
};