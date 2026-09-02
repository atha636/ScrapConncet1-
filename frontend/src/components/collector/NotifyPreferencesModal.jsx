import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SCRAP_TYPES } from "../../services/pickupService";
import { updateProfile } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import ErrorBox from "../common/ErrorBox";

const MIN_RADIUS = 5;
const MAX_RADIUS = 100;

/**
 * Lets a collector set which scrap types and how wide a radius they
 * actually want live "new pickup" events for — instead of every pending
 * pickup nationwide showing up as a toast/list entry regardless of
 * relevance. Saved to the account (User.collectorPreferences), so it
 * persists across sessions/devices, not just this tab.
 */
export default function NotifyPreferencesModal({ open, onClose, defaultRadiusKm }) {
  const { user, login } = useAuth();
  const [scrapTypes, setScrapTypes] = useState(user?.collectorPreferences?.scrapTypes || []);
  const [radiusKm, setRadiusKm] = useState(user?.collectorPreferences?.radiusKm ?? defaultRadiusKm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleType = (t) => {
    setScrapTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await updateProfile({
        collectorPreferences: { scrapTypes, radiusKm: Number(radiusKm) },
      });
      login(localStorage.getItem("token"), res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your preferences.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Notification preferences"
            className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2
                       sm:w-[26rem] max-w-[calc(100vw-2rem)] ticket p-5 pt-6"
          >
            <h3 className="text-base font-bold text-ink mb-1">Notify me for…</h3>
            <p className="text-xs text-inkSoft mb-4">
              Only pickups matching these show up as live alerts. Leave scrap types empty for all.
            </p>

            {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}

            <div className="mb-4">
              <span className="field-label">Scrap types</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {SCRAP_TYPES.map((t) => {
                  const active = scrapTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors ${
                        active
                          ? "bg-rust text-surface border-rust"
                          : "bg-transparent text-inkSoft border-line hover:border-rust/50"
                      }`}
                      aria-pressed={active}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="notify-radius" className="field-label">
                Radius — {radiusKm} km
              </label>
              <input
                id="notify-radius"
                type="range"
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                step={5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="w-full accent-rust"
              />
              <div className="flex justify-between text-[11px] text-inkFaint font-mono mt-1">
                <span>{MIN_RADIUS} km</span>
                <span>{MAX_RADIUS} km</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}