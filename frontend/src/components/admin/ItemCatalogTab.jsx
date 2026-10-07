import { useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { getCatalogAdmin, updateCatalogItem } from "../../services/quoteService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

const inputCls = "w-24 border border-line rounded-md px-2 py-1 text-sm bg-surface text-ink";

// Admin editor for items sold by the piece (phone, washing machine...).
// Value and typical weight feed the user-facing estimate; switching an item
// off hides it from the compare screen.
export default function ItemCatalogTab() {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  const hydrate = (list) => {
    setItems(list);
    setDrafts(
      Object.fromEntries(
        list.map((i) => [i.key, { valueEach: String(i.valueEach), weightKgEach: String(i.weightKgEach), isActive: i.isActive }])
      )
    );
  };

  useEffect(() => {
    getCatalogAdmin()
      .then((res) => hydrate(res.data.items))
      .catch(() => setError("Couldn't load the item catalog."))
      .finally(() => setLoading(false));
  }, []);

  const patch = (key, p) => setDrafts((d) => ({ ...d, [key]: { ...d[key], ...p } }));

  const save = async (item) => {
    const d = drafts[item.key];
    const valueEach = Number(d.valueEach);
    const weightKgEach = Number(d.weightKgEach);
    if (Number.isNaN(valueEach) || valueEach < 0) return setError("Value must be 0 or more.");
    if (Number.isNaN(weightKgEach) || weightKgEach < 0.01) return setError("Weight must be at least 0.01 kg.");

    setError("");
    setSavingKey(item.key);
    try {
      const res = await updateCatalogItem(item.key, { valueEach, weightKgEach, isActive: d.isActive });
      setItems((prev) => prev.map((i) => (i.key === item.key ? res.data : i)));
      setSavedKey(item.key);
      setTimeout(() => setSavedKey((k) => (k === item.key ? null : k)), 1500);
    } catch {
      setError(`Couldn't save ${item.label}.`);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <p className="text-sm text-inkSoft mb-4">
        Items people sell by the piece. The value is the standard payout each; collectors' quotes scale it by how their
        own rate for that category compares to the platform rate.
      </p>
      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      <Card className="divide-y divide-line">
        {items.map((item) => {
          const d = drafts[item.key];
          if (!d) return null;
          const dirty =
            d.valueEach !== String(item.valueEach) ||
            d.weightKgEach !== String(item.weightKgEach) ||
            d.isActive !== item.isActive;
          return (
            <div key={item.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm font-medium text-ink">{item.label}</div>
                <div className="text-xs text-inkFaint">{SCRAP_TYPE_LABELS[item.scrapType]}</div>
              </div>
              <label className="text-xs text-inkSoft flex items-center gap-1">
                ₹
                <input type="number" min="0" value={d.valueEach} onChange={(e) => patch(item.key, { valueEach: e.target.value })} className={inputCls} />
                each
              </label>
              <label className="text-xs text-inkSoft flex items-center gap-1">
                <input type="number" min="0.01" step="0.1" value={d.weightKgEach} onChange={(e) => patch(item.key, { weightKgEach: e.target.value })} className={inputCls} />
                kg
              </label>
              <label className="text-xs text-inkSoft flex items-center gap-1">
                <input type="checkbox" checked={d.isActive} onChange={(e) => patch(item.key, { isActive: e.target.checked })} />
                Shown
              </label>
              <button
                onClick={() => save(item)}
                disabled={!dirty || savingKey === item.key}
                className="text-sm font-medium px-3 py-1.5 rounded-md bg-rust text-white disabled:opacity-40"
              >
                {savingKey === item.key ? "Saving…" : savedKey === item.key ? "Saved" : "Save"}
              </button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}