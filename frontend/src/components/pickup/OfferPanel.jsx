import { useState } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "../../utils/formatPrice";

// Shown inside PickupDetailModal (role="collector") and RequestDetailModal
// (role="requester") for any pickup still in "pending" status. Both modals
// pass a fixed `role` rather than this component figuring it out from the
// logged-in user's id — each modal only ever represents one side of a
// pickup, so there's nothing to derive.
//
// The three server-driven states this renders are exactly the three
// `negotiation.status` values a "pending" pickup can be in:
//   "none" / "declined" — nobody's negotiating right now. A collector can
//     open one; a requester just sees the listed price and waits.
//   "pending" — there's a live back-and-forth. Whoever didn't make the
//     most recent offer gets Accept/Decline/Counter; the other side sees
//     a waiting state. Turn is derived from `negotiation.offers`, not
//     trusted from anywhere else, so it can never drift from what the
//     backend will actually allow.
export default function OfferPanel({ pickup, role, onPropose, onRespond, submitting, error }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [countering, setCountering] = useState(false);

  if (!pickup || pickup.status !== "pending") return null;

  const negotiation = pickup.negotiation || { status: "none", offers: [] };
  const offers = negotiation.offers || [];
  const lastOffer = offers[offers.length - 1];
  const isMyTurn = negotiation.status === "pending" && lastOffer && lastOffer.offeredBy !== role;

  const resetForm = () => {
    setAmount("");
    setNote("");
    setCountering(false);
  };

  const submitCounter = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    onRespond("counter", value, note.trim() || undefined);
    resetForm();
  };

  const submitProposal = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    onPropose(value, note.trim() || undefined);
    resetForm();
  };

  return (
    <div className="rounded-md border border-dashed border-line p-3.5 bg-surfaceRaised/60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-inkFaint">Price negotiation</span>
        {negotiation.status === "pending" && (
          <span className="text-[11px] font-semibold text-amber-dark">
            {isMyTurn ? "Your move" : "Waiting on the other side"}
          </span>
        )}
      </div>

      {/* Offer history — most recent last, same reading order as a chat thread */}
      {offers.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {offers.map((offer, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-inkFaint capitalize">
                {offer.offeredBy === role ? "You" : offer.offeredBy}
                {offer.note ? ` — ${offer.note}` : ""}
              </span>
              <span className="font-mono font-semibold text-ink">{formatPrice(offer.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-danger mb-2">{error}</p>}

      {/* Nothing active — only a collector can start one */}
      {(negotiation.status === "none" || negotiation.status === "declined") && (
        <>
          {role === "collector" && !countering && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCountering(true)}
              className="text-sm font-semibold text-rust hover:underline"
            >
              Propose a different price
            </motion.button>
          )}
          {role === "requester" && (
            <p className="text-xs text-inkFaint">Listed at {formatPrice(pickup.price)} — no active offers.</p>
          )}
          {role === "collector" && countering && (
            <form onSubmit={submitProposal} className="flex items-end gap-2 mt-1">
              <div className="flex-1">
                <label className="block text-[11px] text-inkFaint mb-1">Your offer (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(pickup.price)}
                  className="w-full border border-line rounded-md px-2.5 py-1.5 text-sm font-mono"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-inkFaint mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. looks like grade-A copper"
                  className="w-full border border-line rounded-md px-2.5 py-1.5 text-sm"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary !py-1.5 !px-3 text-sm shrink-0">
                {submitting ? "Sending…" : "Send"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-inkFaint hover:text-danger px-1 shrink-0"
              >
                Cancel
              </button>
            </form>
          )}
        </>
      )}

      {/* Live negotiation, and it's this side's turn */}
      {negotiation.status === "pending" && isMyTurn && !countering && (
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={submitting}
            onClick={() => onRespond("accept")}
            className="btn-primary !py-1.5 !px-3 text-sm"
          >
            {submitting ? "Working…" : `Accept ${formatPrice(lastOffer.amount)}`}
          </motion.button>
          <button
            onClick={() => setCountering(true)}
            className="text-sm font-semibold text-rust hover:underline px-1"
          >
            Counter
          </button>
          <button
            onClick={() => onRespond("decline")}
            disabled={submitting}
            className="text-sm font-semibold text-inkFaint hover:text-danger px-1"
          >
            Decline
          </button>
        </div>
      )}

      {negotiation.status === "pending" && isMyTurn && countering && (
        <form onSubmit={submitCounter} className="flex items-end gap-2 mt-1">
          <div className="flex-1">
            <label className="block text-[11px] text-inkFaint mb-1">Counter (₹)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(lastOffer.amount)}
              className="w-full border border-line rounded-md px-2.5 py-1.5 text-sm font-mono"
              autoFocus
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-inkFaint mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className="w-full border border-line rounded-md px-2.5 py-1.5 text-sm"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary !py-1.5 !px-3 text-sm shrink-0">
            {submitting ? "Sending…" : "Send"}
          </button>
          <button type="button" onClick={resetForm} className="text-xs text-inkFaint hover:text-danger px-1 shrink-0">
            Cancel
          </button>
        </form>
      )}

      {/* Live negotiation, but waiting on the other party */}
      {negotiation.status === "pending" && !isMyTurn && (
        <p className="text-xs text-inkFaint">
          {lastOffer.offeredBy === role ? "You offered" : "They offered"}{" "}
          <span className="font-mono font-semibold text-ink">{formatPrice(lastOffer.amount)}</span>. Waiting for a
          response.
        </p>
      )}
    </div>
  );
}