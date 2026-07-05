import { useState } from "react";
import { submitRating } from "../../services/ratingService";

export default function RatingModal({ pickupId, open, onClose, onSubmitted, otherPartyName }) {
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (score === 0) return setError("Pick a star rating first.");

    setSubmitting(true);
    setError("");
    try {
      const res = await submitRating(pickupId, { score, comment: comment.trim() || undefined });
      onSubmitted?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your rating. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <form onSubmit={handleSubmit} className="ticket w-full max-w-sm p-6">
        <h3 className="font-display font-semibold text-lg text-ink mb-1">
          Rate {otherPartyName || "your pickup"}
        </h3>
        <p className="text-sm text-inkSoft mb-5">How did this pickup go?</p>

        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
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
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
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

        {error && <p className="text-xs text-danger mb-4">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? "Submitting…" : "Submit rating"}
          </button>
        </div>
      </form>
    </div>
  );
}