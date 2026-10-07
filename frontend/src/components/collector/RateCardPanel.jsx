import { useEffect, useState } from "react";
import Card from "../ui/Card";
import ErrorBox from "../common/ErrorBox";
import { getRateCard, saveRateCard } from "../../services/quoteService";
import { SCRAP_TYPES } from "../../services/pickupService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

// A collector's own ₹/kg prices. These decide the quote users see when they
// compare collectors, so leaving a field blank means "I pay the platform
// rate" for that material.
export default function RateCardPanel() {
  const [platform, setPlatform] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getRateCard()
      .then((res) => {
        setPlatform(res.data.platform);
        setDrafts(Object.fromEntries(Object.entries(res.data.mine).map(([k, v]) => [k, String(v)])));
      })
      .catch(() => setError("Couldn't load your rate card."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");
    const rates = {};
    for (const type of SCRAP_TYPES) {
      const raw = (drafts[type] ?? "").trim();
      if (raw === "") {
        rates[type] = null;
        continue;
      }
      const n = Number(raw);
      if (Number.isNaN(n) || n < 1 || n > 1000) return setError("Rates must be between ₹1 and ₹1000 per kg.");
      rates[type] = n;
    }
    setSaving(true);
    try {
      await saveRateCard(rates);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || "Couldn't save your rates. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="p-4">
      <h3 className="font-display text-base font-bold text-ink mb-1">Your rate card</h3>
      <p className="text-xs text-inkSoft mb-3">
        The ₹/kg you pay. Customers comparing collectors see a quote built from these. Leave a field empty to use the
        standard rate.
      </p>

      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <div className="space-y-2">
        {SCRAP_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <span className="text-sm text-ink flex-1">{SCRAP_TYPE_LABELS[type]}</span>
            <span className="text-xs text-inkFaint">₹</span>
            <input
              type="number"
              min="1"
              max="1000"
              step="0.5"
              value={drafts[type] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [type]: e.target.value }))}
              placeholder={String(platform[type] ?? "")}
              className="w-24 border border-line rounded-md px-2 py-1 text-sm bg-surface text-ink"
            />
            <span className="text-xs text-inkFaint">/kg</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-rust text-white text-sm font-medium px-4 py-1.5 rounded-md disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save rates"}
      </button>
    </Card>
  );
}