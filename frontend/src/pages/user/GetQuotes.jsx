import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Card from "../../components/ui/Card";
import Loader from "../../components/common/Loader";
import ErrorBox from "../../components/common/ErrorBox";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import useGeolocation from "../../hooks/useGeolocation";
import { compareQuotes, getItemCatalog } from "../../services/quoteService";
import { SCRAP_TYPES } from "../../services/pickupService";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";
import { formatPrice } from "../../utils/formatPrice";

const MAX_MATERIALS = 6;
const inputCls = "border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";

export default function GetQuotes() {
  useDocumentMeta({ title: "Compare quotes", noindex: true });
  const navigate = useNavigate();
  const { coords, status: locStatus, error: locError, locate } = useGeolocation();

  const [catalog, setCatalog] = useState([]);
  const [materials, setMaterials] = useState([{ scrapType: "metal", weight: "" }]);
  const [counts, setCounts] = useState({}); // { itemKey: qty }
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getItemCatalog()
      .then((res) => setCatalog(res.data.items))
      .catch(() => setCatalog([]));
  }, []);

  const updateMaterial = (idx, patch) =>
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  const bump = (key, delta) =>
    setCounts((prev) => {
      const qty = Math.max(0, Math.min(50, (prev[key] || 0) + delta));
      return { ...prev, [key]: qty };
    });

  const handleCompare = async () => {
    setError("");
    setResult(null);

    const cleanMaterials = materials
      .filter((m) => Number(m.weight) > 0)
      .map((m) => ({ scrapType: m.scrapType, weightKg: Number(m.weight) }));
    const countItems = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => ({ key, qty }));

    if (cleanMaterials.length + countItems.length === 0) {
      return setError("Add the weight of some scrap, or pick an item, to get quotes.");
    }
    if (!coords) return setError("Share your location so we can find collectors near you.");

    setLoading(true);
    try {
      const res = await compareQuotes({ materials: cleanMaterials, countItems, lat: coords.lat, lng: coords.lng });
      setResult({
        ...res.data,
        countSummary: countItems
          .map(({ key, qty }) => `${qty}× ${catalog.find((c) => c.key === key)?.label || key}`)
          .join(", "),
      });
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || err.response?.data?.message || "Couldn't get quotes. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const goRequest = (collector) =>
    navigate("/request", {
      state: {
        pickupItems: result.pickupItems,
        countSummary: result.countSummary,
        collector: collector ? { id: collector.collectorId, name: collector.name, quote: collector.quote } : null,
      },
    });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Compare collector quotes</h1>
      <p className="text-sm text-inkSoft mb-6">
        Tell us what you have, see what it's worth, and pick the collector you like. Quotes are estimates — the final
        amount is settled after your scrap is weighed.
      </p>

      <Card className="p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Scrap by weight</h2>
        <div className="space-y-2">
          {materials.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={m.scrapType} onChange={(e) => updateMaterial(i, { scrapType: e.target.value })} className={`${inputCls} flex-1`}>
                {SCRAP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SCRAP_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.5"
                value={m.weight}
                onChange={(e) => updateMaterial(i, { weight: e.target.value })}
                placeholder="kg"
                className={`${inputCls} w-24`}
              />
              {materials.length > 1 && (
                <button
                  onClick={() => setMaterials((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remove"
                  className="text-inkFaint hover:text-ink px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {materials.length < MAX_MATERIALS && (
          <button
            onClick={() => setMaterials((prev) => [...prev, { scrapType: "plastic", weight: "" }])}
            className="text-sm text-rust mt-3"
          >
            + Add another material
          </button>
        )}

        {catalog.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-ink mt-6 mb-3">Items sold by the piece</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {catalog.map((item) => (
                <div key={item.key} className="flex items-center justify-between border border-line rounded-md px-3 py-2">
                  <div>
                    <div className="text-sm text-ink">{item.label}</div>
                    <div className="text-xs text-inkFaint">about {formatPrice(item.valueEach)} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => bump(item.key, -1)} aria-label={`Fewer ${item.label}`} className="w-7 h-7 rounded-md border border-line text-ink">
                      −
                    </button>
                    <span className="w-5 text-center text-sm text-ink">{counts[item.key] || 0}</span>
                    <button onClick={() => bump(item.key, 1)} aria-label={`More ${item.label}`} className="w-7 h-7 rounded-md border border-line text-ink">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={locate}
            disabled={locStatus === "locating"}
            className="text-sm px-3 py-2 rounded-md border border-line text-ink"
          >
            {locStatus === "locating" ? "Getting location…" : coords ? "✓ Location shared" : "Share my location"}
          </button>
          <button
            onClick={handleCompare}
            disabled={loading}
            className="bg-rust text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? "Comparing…" : "Compare quotes"}
          </button>
        </div>
        {locError && <p className="text-xs text-danger mt-2">{locError}</p>}
      </Card>

      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      {loading && <Loader />}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-5 mb-4">
            <div className="text-xs text-inkSoft">Estimated value at standard rates</div>
            <div className="font-display text-3xl font-bold text-rust">{formatPrice(result.estimate.total)}</div>
            <ul className="mt-3 text-xs text-inkSoft space-y-0.5">
              {result.estimate.lines.map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{l.label}</span>
                  <span>{formatPrice(l.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <h2 className="font-display text-lg font-bold text-ink mb-3">Verified collectors near you</h2>
          {result.collectors.length === 0 ? (
            <Card className="p-5 text-sm text-inkSoft">
              No verified collectors are available within {result.radiusKm} km right now. You can still post a request
              and the next collector to come online can take it.
            </Card>
          ) : (
            <div className="space-y-3">
              {result.collectors.map((c) => (
                <Card key={c.collectorId} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">{c.name}</span>
                        {c.tags.map((tag) => (
                          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-rust/10 text-rust">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-inkSoft mt-1">
                        {c.ratingCount > 0 ? `⭐ ${Number(c.rating).toFixed(1)} (${c.ratingCount})` : "New collector"} · ~
                        {c.etaMin} min away · {c.distanceKm} km
                      </div>
                      <div className="text-[11px] text-inkFaint mt-0.5">
                        {c.usesOwnRates ? "Based on their own rates" : "Based on standard rates"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-bold text-ink">{formatPrice(c.quote)}</div>
                      <button
                        onClick={() => goRequest(c)}
                        className="mt-1 bg-rust text-white text-sm font-medium px-4 py-1.5 rounded-md"
                      >
                        Choose
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <button onClick={() => goRequest(null)} className="text-sm text-rust underline mt-4">
            Request a pickup without choosing a collector
          </button>
          <p className="text-xs text-inkFaint mt-3">
            Arrival times are rough estimates from distance. The chosen collector still has to accept your request.
          </p>
        </motion.div>
      )}
    </div>
  );
}