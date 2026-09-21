import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { createPickup, createRecurring, RECURRING_FREQUENCIES, SCRAP_TYPES, MAX_ITEMS_PER_PICKUP } from "../../services/pickupService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useGeolocation from "../../hooks/useGeolocation";
import { compressImage } from "../../utils/compressImage";
import { SCRAP_TYPE_LABELS as TYPE_LABELS } from "../../utils/pickupItems";
import Card from "../../components/ui/Card";
import ErrorBox from "../../components/common/ErrorBox";
import useDocumentMeta from "../../hooks/useDocumentMeta";

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
  const { user } = useAuth();
  const { showToast } = useToast();
  const { coords, status: locStatus, error: locError, locate } = useGeolocation();

  const [items, setItems] = useState([{ scrapType: "metal", weight: "" }]);
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [repeat, setRepeat] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
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

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => (prev.length >= MAX_ITEMS_PER_PICKUP ? prev : [...prev, { scrapType: "metal", weight: "" }]));
  };

  const removeItem = (idx) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!contactName.trim() || !contactPhone.trim()) {
      return setError("Add a contact name and phone number so the collector can reach you.");
    }

    if (!coords) {
      return setError("Share your pickup location before submitting.");
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append(
        "items",
        JSON.stringify(items.map((it) => ({ scrapType: it.scrapType, estimatedWeightKg: it.weight || undefined })))
      );
      form.append("contactName", contactName.trim());
      form.append("contactPhone", contactPhone.trim());
      form.append("lat", coords.lat);
      form.append("lng", coords.lng);
      if (address) form.append("address", address);
      if (file) form.append("image", file);

      await createPickup(form);

      if (repeat) {
        // Best-effort: the one-time pickup above is the primary action and
        // has already succeeded by this point — a failure setting up the
        // recurring template shouldn't block navigation or make it look
        // like the whole submission failed. Surface it as a toast instead.
        //
        // Recurring templates only carry a single scrapType/weight (see
        // Backend/src/models/RecurringPickup.js) — a repeating pickup is
        // deliberately kept simpler than a one-off, so a multi-item
        // request here only repeats its first item. The form's own note
        // below tells the requester that up front.
        try {
          await createRecurring({
            scrapType: items[0].scrapType,
            estimatedWeightKg: items[0].weight || undefined,
            contactName: contactName.trim(),
            contactPhone: contactPhone.trim(),
            lat: coords.lat,
            lng: coords.lng,
            address: address || undefined,
            frequency,
          });
        } catch {
          showToast({
            title: "Pickup requested",
            message: "But we couldn't set up the repeat schedule — you can try again next time.",
            type: "error",
          });
        }
      }

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

            {/* Items */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-between mb-1">
                <label className="field-label !mb-0">What are you scrapping?</label>
                {items.length > 1 && (
                  <span className="text-xs text-inkFaint">
                    {items.length} items
                  </span>
                )}
              </div>
              <p className="text-xs text-inkFaint mb-2.5">
                Add every kind of scrap in this pile — one pickup, one collector, one trip.
              </p>

              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    {/*
                      Both fields sit inside their own wrapper div rather
                      than taking `w-32`/`flex-1` directly, because
                      `.field-input` (index.css) hard-codes `width: 100%`
                      at equal CSS specificity to a Tailwind width utility
                      declared on the same element — same-specificity, and
                      `.field-input` sits later in the built stylesheet
                      (after @tailwind utilities), so it silently wins the
                      cascade and the utility is ignored. Sizing the
                      *wrapper* instead means `width: 100%` resolves
                      against the wrapper's own box, which is what we
                      actually want, instead of fighting the wrapper's
                      Tailwind width for the same property.
                    */}
                    <div className="flex-1 min-w-0">
                      <select
                        className="field-input w-full"
                        value={item.scrapType}
                        onChange={(e) => updateItem(idx, { scrapType: e.target.value })}
                      >
                        {SCRAP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="kg (optional)"
                        className="field-input w-full"
                        value={item.weight}
                        onChange={(e) => updateItem(idx, { weight: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-ticket border-1.5 border-line text-inkFaint hover:border-danger hover:text-danger disabled:opacity-30 disabled:hover:border-line disabled:hover:text-inkFaint transition-colors"
                      style={{ borderWidth: "1.5px" }}
                      aria-label="Remove item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </div>

              {items.length < MAX_ITEMS_PER_PICKUP && (
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2.5 text-sm font-semibold text-rust hover:underline"
                >
                  + Add another item
                </button>
              )}
            </motion.div>


            {/* Contact */}
            <motion.div variants={fadeUp}>
              <label className="field-label">Contact — so the collector can reach you</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={60}
                  className="field-input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  maxLength={20}
                  className="field-input"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <p className="text-xs text-inkFaint mt-1.5">
                Shown to the collector who accepts this pickup, so they can call or message you.
              </p>
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

            <motion.div variants={fadeUp} className="ticket p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(e) => setRepeat(e.target.checked)}
                  className="w-4 h-4 accent-rust shrink-0"
                />
                <span className="text-sm font-semibold text-ink">Repeat this pickup</span>
              </label>
              <AnimatePresence>
                {repeat && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-inkFaint mt-2 mb-2">
                      We'll automatically request a new pickup with these same details on schedule —
                      pause or cancel it anytime from My requests.
                      {items.length > 1 && (
                        <>
                          {" "}Repeats only re-request {TYPE_LABELS[items[0].scrapType]}, the first item above.
                        </>
                      )}
                    </p>
                    <div className="flex gap-2">
                      {RECURRING_FREQUENCIES.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFrequency(f)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors ${
                            frequency === f
                              ? "bg-rust text-surface border-rust"
                              : "bg-transparent text-inkSoft border-line hover:border-rust/50"
                          }`}
                          aria-pressed={frequency === f}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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