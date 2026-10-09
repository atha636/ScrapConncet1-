import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { listAllPartners, createPartner, updatePartner } from "../../services/partnerService";
import { SCRAP_TYPES } from "../../services/pickupService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

const EMPTY = { name: "", city: "", address: "", accepts: [] };
const inputCls = "mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";

// Admin list of recycling facilities that collectors deliver scrap to.
export default function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await listAllPartners();
      setPartners(res.data.partners);
    } catch {
      setError("Couldn't load recycling partners.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleType = (type) =>
    setForm((f) => ({ ...f, accepts: f.accepts.includes(type) ? f.accepts.filter((t) => t !== type) : [...f.accepts, type] }));

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const current = partners.find((p) => p._id === editingId);
      const body = { ...form, isActive: current ? current.isActive : true };
      if (editingId) await updatePartner(editingId, body);
      else await createPartner(body);
      reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || "Couldn't save the partner.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({ name: p.name, city: p.city, address: p.address || "", accepts: p.accepts || [] });
  };

  const toggleActive = async (p) => {
    setError("");
    try {
      await updatePartner(p._id, { name: p.name, city: p.city, address: p.address || "", accepts: p.accepts, isActive: !p.isActive });
      await load();
    } catch {
      setError("Couldn't update that partner.");
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <h2 className="font-display text-lg font-bold text-ink mb-1">{editingId ? "Edit recycling partner" : "Add a recycling partner"}</h2>
        <p className="text-sm text-inkSoft mb-4">
          Facilities where collectors drop off scrap. After a delivery is recorded, the requester's receipt and impact page
          show where it went.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm text-ink">
            Name
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required />
          </label>
          <label className="block text-sm text-ink">
            City
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} required />
          </label>
          <label className="block text-sm text-ink sm:col-span-2">
            Address (optional)
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm text-ink">Accepts</legend>
            <div className="flex flex-wrap gap-3 mt-1">
              {SCRAP_TYPES.map((t) => (
                <label key={t} className="text-sm text-inkSoft flex items-center gap-1.5">
                  <input type="checkbox" checked={form.accepts.includes(t)} onChange={() => toggleType(t)} />
                  {SCRAP_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
            <span className="text-xs text-inkFaint">Leave all unticked if this partner takes every material.</span>
          </fieldset>

          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="bg-rust text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add partner"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="text-sm px-4 py-2 rounded-md border border-line text-ink">
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>

      <div>
        <h2 className="font-display text-lg font-bold text-ink mb-3">Partners</h2>
        {loading ? (
          <Loader />
        ) : partners.length === 0 ? (
          <p className="text-sm text-inkSoft">None yet — collectors can't record a delivery until you add one.</p>
        ) : (
          <div className="space-y-3">
            {partners.map((p) => (
              <Card key={p._id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {p.name} <span className="text-inkSoft font-normal">· {p.city}</span>
                      {!p.isActive && <span className="ml-2 text-xs text-inkFaint">(inactive)</span>}
                    </div>
                    {p.address && <div className="text-xs text-inkSoft">{p.address}</div>}
                    <div className="text-xs text-inkFaint mt-0.5">
                      {p.accepts?.length ? `Accepts: ${p.accepts.map((t) => SCRAP_TYPE_LABELS[t]).join(", ")}` : "Accepts all materials"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-sm px-3 py-1.5 rounded-md border border-line text-ink">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(p)} className="text-sm px-3 py-1.5 rounded-md border border-rust text-rust">
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}