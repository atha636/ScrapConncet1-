import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
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

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
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

  // Tracks the most recent handleFile() call so a slower-resolving
  // compression from an earlier selection can't overwrite a newer one —
  // without this, picking photo A then quickly picking photo B could
  // finish compressing A *after* B, silently submitting A instead of the
  // photo actually shown in the preview.
  const fileRequestIdRef = useRef(0);
  // The preview blob URL from the current selection, so it can be revoked
  // the moment it's replaced or the page unmounts, instead of leaking one
  // URL per photo picked for the life of the tab.
  const previewUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFile = async (f) => {
    if (!f) return;

    const requestId = ++fileRequestIdRef.current;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objectUrl = URL.createObjectURL(f);
    previewUrlRef.current = objectUrl;
    setPreview(objectUrl); // instant preview from the original

    setCompressing(true);
    try {
      const compressed = await compressImage(f);
      // A newer selection has already started since this one kicked off —
      // let that request's own state updates win instead of stomping them.
      if (requestId !== fileRequestIdRef.current) return;
      setFile(compressed);
    } catch {
      if (requestId !== fileRequestIdRef.current) return;
      setFile(f); // compression failed — fall back to the original file
    } finally {
      if (requestId === fileRequestIdRef.current) setCompressing(false);
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
    <MotionConfig reducedMotion="user">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="font-display text-2xl font-bold text-ink mb-1">Request a pickup</h1>
          <p className="text-sm text-inkSoft mb-6">Fill in the details and a collector nearby will take it from here.</p>
        </motion.div>

        <Card className="p-6 sm:p-8">
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ErrorBox>{error}</ErrorBox>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrap type */}
            <motion.div variants={fadeUp}>
              <label className="field-label">Scrap type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SCRAP_TYPES.map((t) => (
                  <motion.button
                    key={t}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setScrapType(t)}
                    className={`relative py-2.5 rounded-ticket text-sm font-medium border-1.5 transition-colors ${
                      scrapType === t
                        ? "border-rust text-rust"
                        : "border-line text-inkSoft bg-surfaceRaised"
                    }`}
                    style={{ borderWidth: "1.5px" }}
                  >
                    {scrapType === t && (
                      <motion.span
                        layoutId="scrap-type-highlight"
                        className="absolute inset-0 rounded-ticket bg-rust/[0.07]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative">{TYPE_LABELS[t]}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Weight */}
            <motion.div variants={fadeUp}>
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
            </motion.div>

            {/* Location */}
            <motion.div variants={fadeUp}>
              <label className="field-label">Pickup location</label>
              <AnimatePresence mode="wait">
                {coords ? (
                  <motion.div
                    key="captured"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 py-3 rounded-ticket border-1.5 border-amber/50 bg-amber/[0.06]"
                    style={{ borderWidth: "1.5px" }}
                  >
                    <div className="flex items-center gap-2 text-sm text-ink min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4841E" strokeWidth="2" className="shrink-0">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="truncate">Location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span>
                    </div>
                    <button type="button" onClick={locate} className="text-xs font-semibold text-rust hover:underline shrink-0 self-start sm:self-auto">
                      Refresh
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={locate}
                    disabled={locStatus === "locating"}
                    className="btn-secondary w-full justify-center"
                  >
                    <motion.svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      animate={locStatus === "locating" ? { y: [0, -3, 0] } : {}}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </motion.svg>
                    {locStatus === "locating" ? "Getting your location…" : "Share my location"}
                  </motion.button>
                )}
              </AnimatePresence>
              {locError && <p className="text-xs text-danger mt-2">{locError}</p>}

              <input
                type="text"
                placeholder="Landmark / address (optional)"
                className="field-input mt-3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </motion.div>

            {/* Image */}
            <motion.div variants={fadeUp}>
              <label className="field-label">Photo (optional)</label>
              <motion.label
                animate={dragging ? { scale: 1.015 } : { scale: 1 }}
                transition={{ duration: 0.15 }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-ticket py-8 cursor-pointer transition-colors ${
                  dragging ? "border-rust bg-rust/[0.05]" : "border-line bg-surfaceRaised"
                }`}
              >
                <AnimatePresence mode="wait">
                  {preview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="relative"
                    >
                      <img src={preview} alt="Scrap preview" className="h-28 rounded-md object-cover" />
                      {compressing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-ink/40 rounded-md">
                          <span className="text-xs font-medium text-surface">Optimizing photo…</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9C8A73" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-sm text-inkFaint">Drag a photo here, or click to browse</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </motion.label>
            </motion.div>

            <motion.button
              variants={fadeUp}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={submitting || compressing}
            >
              {(submitting || compressing) && (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-surface/40 border-t-surface rounded-full"
                />
              )}
              {submitting ? "Submitting…" : compressing ? "Optimizing photo…" : "Submit request"}
            </motion.button>
          </motion.form>
        </Card>
      </div>
    </MotionConfig>
  );
}