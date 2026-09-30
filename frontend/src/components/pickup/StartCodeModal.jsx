import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ErrorBox from "../common/ErrorBox";

/** Collector enters the 4-digit code the requester shows on arrival. */
export default function StartCodeModal({ open, onClose, onSubmit, submitting, error }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={submitting ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Enter start code"
            className="w-full sm:w-[22rem] max-w-[calc(100vw-2rem)] ticket p-5 pt-6"
          >
            <CodeForm onClose={onClose} onSubmit={onSubmit} submitting={submitting} error={error} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Mounted only while the modal is open, so the typed code resets on every
// open without needing an effect to clear it.
function CodeForm({ onClose, onSubmit, submitting, error }) {
  const [otp, setOtp] = useState("");
  const valid = /^\d{4}$/.test(otp);
  return (
    <>
            <h3 className="text-base font-bold text-ink mb-1">Enter start code</h3>
            <p className="text-xs text-inkSoft mb-4">Ask the requester for their 4-digit code to confirm you've arrived.</p>

            {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}

            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && valid && !submitting && onSubmit(otp)}
              placeholder="••••"
              className="field-input text-center text-2xl tracking-[0.5em] mb-4"
            />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
              <button type="button" onClick={() => onSubmit(otp)} className="btn-primary" disabled={!valid || submitting}>
                {submitting ? "Checking…" : "Start pickup"}
              </button>
            </div>
    </>
  );
}