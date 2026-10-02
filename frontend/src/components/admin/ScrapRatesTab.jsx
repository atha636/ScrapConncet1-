import { useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { getScrapRates, updateScrapRate } from "../../services/scrapRateService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

// Self-contained: fetches and saves on its own rather than plugging into
// AdminPanel's shared load switch, since rate edits (per-row save, its own
// success/error state) don't fit that single loading/error pair cleanly.
export default function ScrapRatesTab() {
  const [rates, setRates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingType, setSavingType] = useState(null);
  const [savedType, setSavedType] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getScrapRates();
      setRates(res.data.rates);
      setDrafts(Object.fromEntries(res.data.rates.map((r) => [r.scrapType, String(r.ratePerKg)])));
    } catch {
      setError("Couldn't load scrap rates. Try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (scrapType) => {
    const value = Number(drafts[scrapType]);
    if (Number.isNaN(value) || value < 0) {
      setError("Rate must be a non-negative number.");
      return;
    }
    setError("");
    setSavingType(scrapType);
    try {
      const res = await updateScrapRate(scrapType, value);
      setRates((prev) => prev.map((r) => (r.scrapType === scrapType ? res.data : r)));
      setSavedType(scrapType);
      setTimeout(() => setSavedType((cur) => (cur === scrapType ? null : cur)), 1500);
    } catch {
      setError(`Couldn't save the rate for ${SCRAP_TYPE_LABELS[scrapType] || scrapType}.`);
    } finally {
      setSavingType(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <p className="text-sm text-inkSoft mb-4">
        Per-kg rates shown on the public rates page and used to estimate pickup pricing.
      </p>

      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <Card className="divide-y divide-line">
        {rates.map((r) => {
          const dirty = drafts[r.scrapType] !== String(r.ratePerKg);
          return (
            <div key={r.scrapType} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">{SCRAP_TYPE_LABELS[r.scrapType] || r.scrapType}</div>
                {r.updatedAt && (
                  <div className="text-xs text-inkFaint font-mono">
                    Updated {new Date(r.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm text-inkSoft">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={drafts[r.scrapType] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.scrapType]: e.target.value }))}
                  className="w-24 border border-line rounded-md px-2 py-1 text-sm text-ink bg-surface focus:outline-none focus:ring-1 focus:ring-rust"
                />
                <span className="text-inkFaint">/kg</span>
              </div>

              <button
                onClick={() => handleSave(r.scrapType)}
                disabled={!dirty || savingType === r.scrapType}
                className="text-sm font-medium px-3 py-1.5 rounded-md bg-rust text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {savingType === r.scrapType ? "Saving…" : savedType === r.scrapType ? "Saved" : "Save"}
              </button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}