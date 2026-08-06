import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitRating } from "../../services/ratingService";

export default function RatingModal({ pickupId, open, onClose, onSubmitted, otherPartyName }) {
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (score === 0) return setError("Pick a star rating first.");

    setSubmitting(true);
    setError("");
    try {
      const res = await submitRating(pickupId, { score, comment: comment.trim() || undefined });
      onSubmitted?.(res.data);
      onClose();
      // Reset for next time this modal opens on a different pickup — otherwise
      // a 5-star rating would linger pre-selected on the next one.
      setScore(0);
      setComment("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your rating. Try again.");
    } finally {
      setSubmitting(false);
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
        >
          <motion.form
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onSubmit={handleSubmit}
            className="ticket w-full max-w-sm p-6"
          >
            <h3 className="font-display font-semibold text-lg text-ink mb-1">
              Rate {otherPartyName || "your pickup"}
            </h3>
            <p className="text-sm text-inkSoft mb-5">How did this pickup go?</p>

            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  animate={score === n ? { scale: [1, 1.25, 1] } : {}}
                  transition={{ duration: 0.25 }}
                  onClick={() => setScore(n)}
                  onMouseEnter={() => setHoverScore(n)}
                  onMouseLeave={() => setHoverScore(0)}
                  className="p-1"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill={(hoverScore || score) >= n ? "#C4841E" : "none"}
                    stroke={(hoverScore || score) >= n ? "#C4841E" : "#D8C9AE"}
                    strokeWidth="1.5"
                    style={{ transition: "fill 0.15s, stroke 0.15s" }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </motion.button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)"
              maxLength={500}
              rows={3}
              className="field-input resize-none mb-4"
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-danger mb-4 overflow-hidden"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? "Submitting…" : "Submit rating"}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}