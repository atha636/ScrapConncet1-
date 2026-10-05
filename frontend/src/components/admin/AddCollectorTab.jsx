import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import {
  createCollector,
  getAdminCreatedCollectors,
  resetCollectorPassword,
} from "../../services/adminCollectorService";

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar card" },
  { value: "driving_license", label: "Driving licence" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan", label: "PAN card" },
];

const EMPTY = { name: "", email: "", phone: "", password: "", idType: "aadhaar", idLast4: "" };

const inputCls = "mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";

const errorFrom = (err, fallback) =>
  err.response?.data?.details?.[0]?.message || err.response?.data?.message || fallback;

export default function AddCollectorTab() {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  const loadList = useCallback(async () => {
    try {
      const res = await getAdminCreatedCollectors();
      setList(res.data.collectors);
    } catch {
      setError("Couldn't load the collector list.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCreated(null);
    if (!/^\d{4}$/.test(form.idLast4)) return setError("Enter only the last 4 digits of the ID number.");
    if (form.password.length < 8) return setError("Temporary password must be at least 8 characters.");
    if (!file) return setError("Upload a photo of the collector's ID.");

    setSubmitting(true);
    try {
      await createCollector({ ...form, file });
      setCreated({ email: form.email, password: form.password });
      setForm(EMPTY);
      setFile(null);
      await loadList();
    } catch (err) {
      setError(errorFrom(err, "Couldn't create the collector."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (id) => {
    setResetMsg("");
    setError("");
    setResetBusy(true);
    try {
      await resetCollectorPassword(id, resetPassword);
      setResetMsg("Temporary password updated. Share it with the collector.");
      setResetId(null);
      setResetPassword("");
      await loadList();
    } catch (err) {
      setError(errorFrom(err, "Couldn't reset the password."));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <h2 className="font-display text-lg font-bold text-ink mb-1">Add a collector</h2>
        <p className="text-sm text-inkSoft mb-4">
          The account is verified and the ID approved right away. Share the email and temporary password with the
          collector — they'll be asked to change it from their Profile after logging in.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
        {created && (
          <div className="mb-4 rounded-md border border-line bg-surface p-3 text-sm text-ink">
            Collector created. Login: <span className="font-mono">{created.email}</span> · Temporary password:{" "}
            <span className="font-mono">{created.password}</span>
            <div className="text-xs text-inkFaint mt-1">This is only shown now — note it down before leaving.</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm text-ink">
            Full name
            <input value={form.name} onChange={set("name")} className={inputCls} required />
          </label>
          <label className="block text-sm text-ink">
            Email
            <input type="email" value={form.email} onChange={set("email")} className={inputCls} required />
          </label>
          <label className="block text-sm text-ink">
            Phone
            <input value={form.phone} onChange={set("phone")} className={inputCls} required />
          </label>
          <label className="block text-sm text-ink">
            Temporary password
            <input
              type="text"
              value={form.password}
              onChange={set("password")}
              autoComplete="off"
              className={inputCls}
              required
            />
            <span className="text-xs text-inkFaint">8+ characters with a letter and a number.</span>
          </label>
          <label className="block text-sm text-ink">
            ID type
            <select value={form.idType} onChange={set("idType")} className={inputCls}>
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ink">
            Last 4 digits of ID number
            <input
              inputMode="numeric"
              maxLength={4}
              value={form.idLast4}
              onChange={(e) => setForm((f) => ({ ...f, idLast4: e.target.value.replace(/\D/g, "") }))}
              className={inputCls}
              required
            />
            <span className="text-xs text-inkFaint">The full number is never stored.</span>
          </label>

          <label className="block text-sm text-ink sm:col-span-2">
            Photo of the ID
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-inkSoft"
            />
          </label>
          {preview && (
            <img src={preview} alt="ID preview" className="max-h-40 rounded-md border border-line sm:col-span-2" />
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-rust text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create collector"}
            </button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="font-display text-lg font-bold text-ink mb-3">Collectors you added</h2>
        {resetMsg && <p className="text-sm text-inkSoft mb-3">{resetMsg}</p>}

        {loadingList ? (
          <Loader />
        ) : list.length === 0 ? (
          <p className="text-sm text-inkSoft">None yet.</p>
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink">{c.name}</div>
                    <div className="text-xs text-inkSoft">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                    <div className="text-xs text-inkFaint font-mono mt-1">
                      {c.mustChangePassword ? "Still on temporary password" : "Password changed"}
                      {c.idLast4 ? ` · ID ends ${c.idLast4}` : ""}
                      {!c.isActive ? " · deactivated" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setResetId(resetId === c.id ? null : c.id);
                      setResetPassword("");
                    }}
                    className="text-sm px-3 py-1.5 rounded-md border border-line text-ink"
                  >
                    Reset password
                  </button>
                </div>

                {resetId === c.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      autoComplete="off"
                      placeholder="New temporary password"
                      className="flex-1 border border-line rounded-md px-3 py-1.5 text-sm bg-surface text-ink"
                    />
                    <button
                      onClick={() => handleReset(c.id)}
                      disabled={resetBusy || resetPassword.length < 8}
                      className="text-sm px-3 py-1.5 rounded-md bg-rust text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}