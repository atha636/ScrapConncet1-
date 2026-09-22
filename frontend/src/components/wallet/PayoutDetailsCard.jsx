import { useState } from "react";
import { motion } from "framer-motion";
import Card from "../ui/Card";
import ErrorBox from "../common/ErrorBox";
import { updatePayoutDetails } from "../../services/walletService";
import { maskUpi, maskAccountNumber } from "../../utils/payoutMask";

// Read-only summary of whatever's currently saved — shown by default so a
// collector who already set this up isn't re-shown a form (and their full
// account number/UPI handle) every time they open the Wallet tab. Editing
// is an explicit click, not the default state.
function SavedSummary({ details, onEdit }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-xs text-inkFaint mb-1">
          {details.method === "upi" ? "UPI ID" : "Bank account"}
        </div>
        <div className="font-mono text-sm text-ink">
          {details.method === "upi" ? maskUpi(details.upiId) : maskAccountNumber(details.bankAccountNumber)}
        </div>
        {details.method === "bank" && (
          <div className="text-xs text-inkSoft mt-0.5">
            {details.bankAccountHolder} · {details.bankIfsc}
          </div>
        )}
      </div>
      <button type="button" onClick={onEdit} className="text-sm font-semibold text-rust hover:underline">
        Change
      </button>
    </div>
  );
}

// The collector's own payout destination — set once, edited rarely.
// Deliberately its own card above "Request a payout" (not folded into
// that form) since this is standing account info, not something you
// re-enter with every withdrawal request.
export default function PayoutDetailsCard({ details, onSaved }) {
  const [editing, setEditing] = useState(!details);
  const [method, setMethod] = useState(details?.method || "upi");
  const [upiId, setUpiId] = useState(details?.upiId || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(details?.bankAccountNumber || "");
  const [bankIfsc, setBankIfsc] = useState(details?.bankIfsc || "");
  const [bankAccountHolder, setBankAccountHolder] = useState(details?.bankAccountHolder || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    // Re-seed the form from whatever's currently saved every time editing
    // opens, rather than leaving stale values from a previous abandoned
    // edit sitting in the fields.
    setMethod(details?.method || "upi");
    setUpiId(details?.upiId || "");
    setBankAccountNumber(details?.bankAccountNumber || "");
    setBankIfsc(details?.bankIfsc || "");
    setBankAccountHolder(details?.bankAccountHolder || "");
    setError("");
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload =
        method === "upi"
          ? { method, upiId: upiId.trim() }
          : {
              method,
              bankAccountNumber: bankAccountNumber.trim(),
              bankIfsc: bankIfsc.trim(),
              bankAccountHolder: bankAccountHolder.trim(),
            };
      const res = await updatePayoutDetails(payload);
      onSaved(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your payout details — check the fields and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 mb-6">
      <h3 className="font-display font-semibold text-ink text-sm mb-3">Where should payouts go?</h3>

      {!editing && details ? (
        <SavedSummary details={details} onEdit={startEdit} />
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          {!details && (
            <p className="text-xs text-inkFaint -mt-1">
              Add a UPI ID or bank account so admin knows where to send an approved payout.
            </p>
          )}
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex gap-2">
            {[
              { value: "upi", label: "UPI" },
              { value: "bank", label: "Bank transfer" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMethod(opt.value)}
                className={`px-3 py-1.5 rounded-ticket text-sm font-medium border-1.5 transition-colors ${
                  method === opt.value ? "border-rust text-rust" : "border-line text-inkSoft"
                }`}
                style={{ borderWidth: "1.5px" }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {method === "upi" ? (
            <div>
              <label className="field-label">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okhdfc"
                className="field-input"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="field-label">Account number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="field-input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">IFSC</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="field-input uppercase"
                  />
                </div>
                <div>
                  <label className="field-label">Account holder name</label>
                  <input
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    placeholder="As per bank records"
                    className="field-input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting} className="btn-primary !py-2 !px-4 text-sm">
              {submitting ? "Saving…" : "Save"}
            </motion.button>
            {details && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-inkFaint hover:text-danger"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}