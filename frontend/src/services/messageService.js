import API from "./api";

export const getMessages = (pickupId) => API.get(`/pickup/${pickupId}/messages`);

// Plain JSON for a text-only message (unchanged from before); switches to
// multipart automatically the moment an image file is passed — the
// backend's conditional multer middleware handles either shape on the
// same endpoint (see messageRoutes.js), so this is the one function every
// caller uses regardless of what they're sending.
export const sendMessage = (pickupId, text, imageFile) => {
  if (!imageFile) return API.post(`/pickup/${pickupId}/messages`, { text });

  const formData = new FormData();
  if (text) formData.append("text", text);
  formData.append("image", imageFile);
  return API.post(`/pickup/${pickupId}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const markMessagesRead = (pickupId) => API.patch(`/pickup/${pickupId}/messages/read`);