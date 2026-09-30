import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { compressImage } from "../../utils/compressImage";
import ErrorBox from "../common/ErrorBox";
import { getPickupItems, SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

/**
 * Required, not optional — a completion photo's whole value is as proof of
 * collection, which a merely-encouraged upload undermines (a collector in a
 * hurry would just skip it, and disputes on exactly those pickups would be
 * back to square one). Same portal + flexbox-centering pattern as the
 * other modals built this session — proven to render correctly regardless
 * of any Framer Motion `layout` ancestor elsewhere on the page.
 */
export default function CompletionPhotoModal({ open, onClose, onSubmit, submitting, error, pickup }) {
  const items = getPickupItems(pickup);
  // One weighed value per original item, same order — the backend requires
  // the same scrap types in the same order as the request.
  const [weights, setWeights] = useState([]);
  useEffect(() => {
    if (open) setWeights(items.map((it) => (it.estimatedWeightKg ? String(it.estimatedWeightKg) : "")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pickup?._id]);
  const weightsValid = items.length > 0 && weights.length === items.length && weights.every((w) => Number(w) >= 0.1);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef(null);

  // Revoke the object URL on unmount / when a new file replaces it, rather
  // than leaking one blob URL per photo picked during the session.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(picked);
      setFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = () => {
    if (!file || !weightsValid) return;
    onSubmit(
      file,
      items.map((it, i) => ({ scrapType: it.scrapType, actualWeightKg: Number(weights[i]) }))
    );
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={submitting ? undefined : handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add a completion photo"
            className="w-full sm:w-[26rem] max-w-[calc(100vw-2rem)] ticket p-5 pt-6"
          >
            <h3 className="text-base font-bold text-ink mb-1">Weigh &amp; add a photo</h3>
            <p className="text-xs text-inkSoft mb-3">
              Enter the actual weighed weight and add a photo of the collected scrap — together they're the evidence if anything's ever disputed.
            </p>

            <div className="mb-4 space-y-2">
              {items.map((it, i) => (
                <label key={i} className="flex items-center justify-between gap-3 text-sm text-ink">
                  <span>
                    {SCRAP_TYPE_LABELS[it.scrapType] || it.scrapType}
                    {it.estimatedWeightKg ? <span className="text-inkFaint"> (est. {it.estimatedWeightKg}kg)</span> : null}
                  </span>
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="0.1"
                      value={weights[i] ?? ""}
                      onChange={(e) => setWeights((prev) => prev.map((w, j) => (j === i ? e.target.value : w)))}
                      className="field-input !py-1.5 w-24 text-right"
                      aria-label={`Actual weight of ${it.scrapType} in kg`}
                    />
                    <span className="text-inkSoft">kg</span>
                  </span>
                </label>
              ))}
            </div>

            {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="block w-full mb-4 rounded-md overflow-hidden border border-line"
              >
                <img src={previewUrl} alt="Completion preview" className="w-full h-40 object-cover" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={compressing}
                className="w-full mb-4 h-40 rounded-md border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 text-inkFaint hover:border-rust/50 hover:text-rust transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm font-semibold">{compressing ? "Optimizing…" : "Take or choose a photo"}</span>
              </button>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="btn-secondary" disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={!file || !weightsValid || submitting || compressing}
              >
                {submitting ? "Submitting…" : "Mark completed"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}