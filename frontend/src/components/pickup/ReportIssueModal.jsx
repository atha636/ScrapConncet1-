import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createDispute, DISPUTE_REASONS } from "../../services/pickupService";
import ErrorBox from "../common/ErrorBox";

const REASON_LABELS = {
  no_show: "Never showed up",
  wrong_weight_or_price: "Weight or price disagreement",
  damaged_property: "Property damaged",
  unsafe_or_rude_behavior: "Unsafe or rude behavior",
  payment_issue: "Payment issue",
  other: "Other",
};

/**
 * Lets either party to a pickup — requester or collector — flag that
 * something went wrong, independent of the star rating (a rating alone
 * gives no one anything actionable to follow up on). Files a Dispute the
 * admin queue can review and resolve. Same portal + flexbox-centering
 * pattern as NotifyPreferencesModal — proven to render correctly
 * regardless of any Framer Motion `layout` ancestor elsewhere on the page.
 */
export default function ReportIssueModal({ pickupId, open, onClose, onSubmitted }) {
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setReason(DISPUTE_REASONS[0]);
    setDescription("");
    setError("");
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await createDispute(pickupId, { reason, description: description.trim() || undefined });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      if (err.response?.status === 409) {
        setError("You've already reported an issue for this pickup — our team is looking into it.");
      } else {
        setError(err.response?.data?.message || "Couldn't submit your report. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
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
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Report an issue"
            className="w-full sm:w-[26rem] max-w-[calc(100vw-2rem)] ticket p-5 pt-6"
          >
            {submitted ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-rust/10 flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A63D24" strokeWidth="2.3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">Report submitted</h3>
                <p className="text-sm text-inkSoft mb-4">Our team will review it and follow up if needed.</p>
                <button type="button" onClick={handleClose} className="btn-primary">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-ink mb-1">Report an issue</h3>
                <p className="text-xs text-inkSoft mb-4">
                  This goes to our team, separate from your star rating — use it for anything that needs a real follow-up.
                </p>

                {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}

                <div className="mb-4">
                  <span className="field-label">What happened?</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {DISPUTE_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          reason === r
                            ? "bg-rust text-surface border-rust"
                            : "bg-transparent text-inkSoft border-line hover:border-rust/50"
                        }`}
                        aria-pressed={reason === r}
                      >
                        {REASON_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label htmlFor="dispute-description" className="field-label">
                    Details — optional
                  </label>
                  <textarea
                    id="dispute-description"
                    rows={3}
                    maxLength={1000}
                    placeholder="Anything that would help our team look into this…"
                    className="field-input resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={handleClose} className="btn-secondary" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSubmit} className="btn-primary" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}