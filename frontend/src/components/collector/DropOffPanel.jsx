import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card";
import ErrorBox from "../common/ErrorBox";
import { getPendingDropOffs, recordDropOff } from "../../services/dropOffService";
import { listPartners } from "../../services/partnerService";
import { compressImage } from "../../utils/compressImage";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

const kgSummary = (lines) =>
  lines
    .map((l) => `${l.kg != null ? `${l.kg} kg ` : ""}${SCRAP_TYPE_LABELS[l.scrapType] || l.scrapType}`)
    .join(", ");

// Last step of the chain: after collecting, the collector delivers the load
// to a recycling partner and records it here with a photo. One delivery can
// cover several completed pickups. Renders nothing when there's nothing
// waiting to be delivered.
export default function DropOffPanel() {
  const [pending, setPending] = useState(null);
  const [partners, setPartners] = useState([]);
  const [selected, setSelected] = useState({});
  const [partnerId, setPartnerId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const inputRef = useRef(null);

  const load = async () => {
    try {
      const [p, pr] = await Promise.all([getPendingDropOffs(), listPartners()]);
      setPending(p.data.pickups);
      setPartners(pr.data.partners);
      setSelected(Object.fromEntries(p.data.pickups.map((x) => [x.id, true])));
    } catch {
      setPending([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handlePhoto = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(picked);
      setPhoto(compressed);
      setPreview(URL.createObjectURL(compressed));
    } finally {
      setCompressing(false);
    }
  };

  if (pending === null) return null;
  if (pending.length === 0 && !done) return null;

  const chosen = pending.filter((p) => selected[p.id]);
  const chosenTypes = new Set(chosen.flatMap((p) => p.lines.map((l) => l.scrapType)));
  const partnerFits = (partner) =>
    !partner.accepts?.length || [...chosenTypes].every((t) => partner.accepts.includes(t));

  const handleSubmit = async () => {
    setError("");
    setDone("");
    if (chosen.length === 0) return setError("Choose at least one pickup.");
    if (!partnerId) return setError("Choose the recycling partner.");
    if (!photo) return setError("Add a photo of the delivery.");

    setSubmitting(true);
    try {
      const res = await recordDropOff({ partnerId, pickupIds: chosen.map((p) => p.id), photo });
      setDone(`Recorded ${res.data.recorded} pickup${res.data.recorded === 1 ? "" : "s"} as delivered to ${res.data.partner.name}.`);
      setPhoto(null);
      setPreview(null);
      setPartnerId("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't record the delivery. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 mb-4">
      <h3 className="font-display text-base font-bold text-ink mb-1">Deliver to recycling</h3>
      <p className="text-xs text-inkSoft mb-3">
        Record where you took the scrap you've collected. Customers see this on their receipt.
      </p>

      {done && <p className="text-sm text-ink mb-3">{done}</p>}
      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div className="space-y-1.5 mb-4">
            {pending.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm text-ink border border-line rounded-md px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!selected[p.id]}
                  onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                />
                <span>
                  {kgSummary(p.lines)}
                  {p.address && <span className="block text-xs text-inkFaint">{p.address}</span>}
                </span>
              </label>
            ))}
          </div>

          {partners.length === 0 ? (
            <p className="text-xs text-inkSoft">No recycling partners have been added yet — ask an admin to add one.</p>
          ) : (
            <label className="block text-sm text-ink mb-3">
              Recycling partner
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink"
              >
                <option value="">Choose…</option>
                {partners.map((p) => (
                  <option key={p._id} value={p._id} disabled={!partnerFits(p)}>
                    {p.name} · {p.city}
                    {!partnerFits(p) ? " (doesn't take everything selected)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto} className="hidden" />
          {preview ? (
            <button type="button" onClick={() => inputRef.current?.click()} className="block w-full mb-3 rounded-md overflow-hidden border border-line">
              <img src={preview} alt="Delivery preview" className="w-full h-32 object-cover" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={compressing}
              className="w-full mb-3 h-24 rounded-md border-2 border-dashed border-line text-sm text-inkFaint hover:border-rust/50 hover:text-rust"
            >
              {compressing ? "Optimizing…" : "Photo of the delivery at the partner"}
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || compressing}
            className="bg-rust text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            {submitting ? "Saving…" : `Record delivery (${chosen.length})`}
          </button>
        </>
      )}
    </Card>
  );
}