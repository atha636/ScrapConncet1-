import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPickup, SCRAP_TYPES } from "../../services/pickupService";
import useGeolocation from "../../hooks/useGeolocation";
import { compressImage } from "../../utils/compressImage";
import Card from "../../components/ui/Card";
import ErrorBox from "../../components/common/ErrorBox";
import useDocumentMeta from "../../hooks/useDocumentMeta";

const TYPE_LABELS = {
  metal: "Metal",
  plastic: "Plastic",
  paper: "Paper",
  "e-waste": "E-waste",
  glass: "Glass",
  other: "Other",
};

export default function RequestPickup() {
  useDocumentMeta({ title: "Request Pickup", noindex: true });

  const navigate = useNavigate();
  const { coords, status: locStatus, error: locError, locate } = useGeolocation();

  const [scrapType, setScrapType] = useState("metal");
  const [weight, setWeight] = useState("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (f) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f)); // instant preview from the original
    setCompressing(true);
    try {
      const compressed = await compressImage(f);
      setFile(compressed);
    } catch {
      setFile(f); // compression failed — fall back to the original file
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!coords) {
      return setError("Share your pickup location before submitting.");
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append("scrapType", scrapType);
      if (weight) form.append("estimatedWeightKg", weight);
      form.append("lat", coords.lat);
      form.append("lng", coords.lng);
      if (address) form.append("address", address);
      if (file) form.append("image", file);

      await createPickup(form);
      navigate("/my-requests");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Request a pickup</h1>
      <p className="text-sm text-inkSoft mb-6">Fill in the details and a collector nearby will take it from here.</p>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorBox>{error}</ErrorBox>}

          {/* Scrap type */}
          <div>
            <label className="field-label">Scrap type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SCRAP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setScrapType(t)}
                  className={`py-2.5 rounded-ticket text-sm font-medium border-1.5 transition-all ${
                    scrapType === t
                      ? "border-rust bg-rust/[0.07] text-rust -translate-y-0.5"
                      : "border-line text-inkSoft bg-surfaceRaised"
                  }`}
                  style={{ borderWidth: "1.5px" }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="field-label">Estimated weight (kg) — optional</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 5"
              className="field-input"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {/* Location */}
          <div>
            <label className="field-label">Pickup location</label>
            {coords ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 py-3 rounded-ticket border-1.5 border-amber/50 bg-amber/[0.06]" style={{ borderWidth: "1.5px" }}>
                <div className="flex items-center gap-2 text-sm text-ink min-w-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4841E" strokeWidth="2" className="shrink-0">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="truncate">Location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span>
                </div>
                <button type="button" onClick={locate} className="text-xs font-semibold text-rust hover:underline shrink-0 self-start sm:self-auto">
                  Refresh
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={locate}
                disabled={locStatus === "locating"}
                className="btn-secondary w-full justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {locStatus === "locating" ? "Getting your location…" : "Share my location"}
              </button>
            )}
            {locError && <p className="text-xs text-danger mt-2">{locError}</p>}

            <input
              type="text"
              placeholder="Landmark / address (optional)"
              className="field-input mt-3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Image */}
          <div>
            <label className="field-label">Photo (optional)</label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-ticket py-8 cursor-pointer transition-colors ${
                dragging ? "border-rust bg-rust/[0.05]" : "border-line bg-surfaceRaised"
              }`}
            >
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Scrap preview" className="h-28 rounded-md object-cover" />
                  {compressing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink/40 rounded-md">
                      <span className="text-xs font-medium text-surface">Optimizing photo…</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9C8A73" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-sm text-inkFaint">Drag a photo here, or click to browse</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting || compressing}>
            {submitting ? "Submitting…" : compressing ? "Optimizing photo…" : "Submit request"}
          </button>
        </form>
      </Card>
    </div>
  );
}