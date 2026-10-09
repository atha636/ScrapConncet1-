import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { getPendingDropOffs, recordDropOff } from "../../services/dropOffService";
import { listPartners } from "../../services/partnerService";
import { compressImage } from "../../utils/compressImage";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

const sumKg = (pickups) =>
  Math.round(pickups.reduce((total, p) => total + p.lines.reduce((s, l) => s + (l.kg || 0), 0), 0) * 10) / 10;

// The "Recycle" tab: after collecting, the collector delivers the load to a
// recycling partner and records it here with a photo. One delivery can cover
// several completed pickups. `onPendingChange` lets the dashboard show the
// number of pickups still waiting in the tab label.
export default function DropOffPanel({ onPendingChange }) {
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
      onPendingChange?.(p.data.pickups.length);
    } catch {
      setPending([]);
      setError("Couldn't load your pending deliveries. Try refreshing.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (pending === null) return <Loader />;

  if (pending.length === 0) {
    return (
      <Card className="p-10 text-center">
        {done && <p className="text-sm text-ink mb-3">{done}</p>}
        {error && (
          <div className="mb-3">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
        <div className="font-display text-lg font-bold text-ink mb-1">Nothing to deliver</div>
        <p className="text-sm text-inkSoft max-w-sm mx-auto">
          Once you complete a pickup it shows up here, so you can record which recycling partner you took it to.
        </p>
      </Card>
    );
  }

  const chosen = pending.filter((p) => selected[p.id]);
  const chosenTypes = new Set(chosen.flatMap((p) => p.lines.map((l) => l.scrapType)));
  const partnerFits = (partner) => !partner.accepts?.length || [...chosenTypes].every((t) => partner.accepts.includes(t));
  const allSelected = chosen.length === pending.length;

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
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      {/* Left: what's waiting */}
      <div className="lg:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink leading-tight">Ready to deliver</h2>
            <p className="text-xs text-inkSoft">
              {pending.length} pickup{pending.length === 1 ? "" : "s"} · about {sumKg(pending)} kg collected
            </p>
          </div>
          <button
            onClick={() => setSelected(Object.fromEntries(pending.map((p) => [p.id, !allSelected])))}
            className="text-sm text-rust"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>

        <div className="space-y-2">
          {pending.map((p) => (
            <label
              key={p.id}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                selected[p.id] ? "border-rust/50 bg-rust/[0.04]" : "border-line bg-surface hover:border-rust/30"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 accent-[#A63D24]"
                checked={!!selected[p.id]}
                onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {p.lines.map((l, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-line/50 text-ink">
                      {l.kg != null ? `${l.kg} kg ` : ""}
                      {SCRAP_TYPE_LABELS[l.scrapType] || l.scrapType}
                    </span>
                  ))}
                </div>
                {p.address && <div className="text-xs text-inkFaint mt-1.5 truncate">{p.address}</div>}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Right: the delivery details */}
      <Card className="lg:col-span-2 p-4 lg:sticky lg:top-20">
        <h2 className="font-display text-base font-bold text-ink mb-1">Delivery details</h2>
        <p className="text-xs text-inkSoft mb-4">Customers see this on their receipt.</p>

        {done && <p className="text-sm text-ink mb-3">{done}</p>}
        {error && (
          <div className="mb-3">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}

        {partners.length === 0 ? (
          <p className="text-sm text-inkSoft">No recycling partners have been added yet — ask an admin to add one.</p>
        ) : (
          <label className="block text-sm text-ink mb-4">
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

        <div className="text-sm text-ink mb-1">Photo of the delivery</div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto} className="hidden" />
        {preview ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="block w-full mb-4 rounded-md overflow-hidden border border-line">
            <img src={preview} alt="Delivery preview" className="w-full h-36 object-cover" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={compressing}
            className="w-full mb-4 h-28 rounded-md border-2 border-dashed border-line text-sm text-inkFaint hover:border-rust/50 hover:text-rust transition-colors"
          >
            {compressing ? "Optimizing…" : "Take or choose a photo"}
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || compressing || chosen.length === 0}
          className="w-full bg-rust text-white text-sm font-medium py-2.5 rounded-md disabled:opacity-50"
        >
          {submitting ? "Saving…" : `Record delivery (${chosen.length})`}
        </button>
      </Card>
    </div>
  );
}