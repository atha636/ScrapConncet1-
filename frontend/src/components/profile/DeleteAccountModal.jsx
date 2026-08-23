import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { deleteAccount } from "../../services/authService";
import ErrorBox from "../common/ErrorBox";

const CONFIRM_WORD = "DELETE";

const CONSEQUENCES = [
  "Your profile, name, and contact details are permanently removed.",
  "You'll be signed out on every device immediately.",
  "You won't be able to log back in with this email.",
  "This can't be undone — there's no recovery window.",
];

export default function DeleteAccountModal({ open, hasPassword = true, onClose, onDeleted }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmText("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return; // don't let a stray click dismiss mid-request
    reset();
    onClose();
  };

  const canSubmit = confirmText === CONFIRM_WORD && (!hasPassword || password.length > 0) && !loading;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await deleteAccount({ password: hasPassword ? password : undefined, confirm: confirmText });
      reset();
      onDeleted();
    } catch (err) {
      const details = err.response?.data?.details;
      setError(details?.[0]?.message || err.response?.data?.message || "Couldn't delete your account.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="ticket w-full max-w-md p-6 sm:p-7"
          >
            <div className="flex items-start gap-3 mb-1">
              <div className="shrink-0 w-9 h-9 rounded-full bg-rust/10 flex items-center justify-center text-rust">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.5 20.5h17a1.5 1.5 0 001.39-2.46L13.71 3.86a1.5 1.5 0 00-2.42 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-ink">Delete your account</h3>
                <p className="text-sm text-inkSoft mt-0.5">This is permanent — please read before continuing.</p>
              </div>
            </div>

            <ul className="mt-4 mb-5 space-y-2">
              {CONSEQUENCES.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-inkSoft">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-rust shrink-0" />
                  {line}
                </li>
              ))}
            </ul>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-4"
                >
                  <ErrorBox>{error}</ErrorBox>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {hasPassword && (
                <div>
                  <label className="field-label">Confirm your password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input"
                    placeholder="Your current password"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="field-label">
                  Type <span className="font-semibold text-ink">{CONFIRM_WORD}</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="field-input"
                  placeholder={CONFIRM_WORD}
                  autoFocus={!hasPassword}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={loading}>
                Cancel
              </button>
              <motion.button
                whileTap={canSubmit ? { scale: 0.97 } : undefined}
                type="button"
                onClick={handleDelete}
                disabled={!canSubmit}
                className="flex-1 rounded-md bg-rust text-surface text-sm font-semibold py-2.5 hover:bg-rust/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rust"
              >
                {loading ? "Deleting…" : "Delete my account"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}