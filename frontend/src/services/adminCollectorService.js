import API from "./api";

// fields: { name, email, phone, password, idType, idLast4, file }
export const createCollector = ({ name, email, phone, password, idType, idLast4, file }) => {
  const form = new FormData();
  form.append("name", name);
  form.append("email", email);
  form.append("phone", phone);
  form.append("password", password);
  form.append("idType", idType);
  form.append("idLast4", idLast4);
  form.append("document", file);
  return API.post("/admin/collectors", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getAdminCreatedCollectors = () => API.get("/admin/collectors");

export const resetCollectorPassword = (id, password) =>
  API.patch(`/admin/collectors/${id}/reset-password`, { password });