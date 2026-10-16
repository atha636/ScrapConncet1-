import { useEffect, useState } from "react";
import Card from "../ui/Card";
import ErrorBox from "../common/ErrorBox";
import { getMyUpi, saveMyUpi, clearMyUpi } from "../../services/paymentService";
import { maskUpi } from "../../utils/payoutMask";

const UPI_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

/** Profile card (requesters): the UPI ID collectors pay your scrap money to. */
export default function UpiIdCard() {
  const [saved, setSaved] = useState(null); // null = loading, "" = none
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getMyUpi()
      .then((res) => alive && setSaved(res.data.upiId || ""))
      .catch(() => alive && setSaved(""));
    return () => { alive = false; };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const id = value.trim();
    if (!UPI_PATTERN.test(id)) {
      setError("Enter a valid UPI ID, like name@upi");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await saveMyUpi(id);
      setSaved(res.data.upiId);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your UPI ID.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await clearMyUpi();
      setSaved("");
      setValue("");
    } catch {
      setError("Couldn't remove your UPI ID.");
    } finally {
      setBusy(false);
    }
  };

  const showForm = editing || saved === "";

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display font-semibold text-ink mb-1.5">Get paid by UPI</h2>
      <p className="text-sm text-inkSoft mb-4">
        Add your UPI ID so your collector can pay you in one tap from GPay, PhonePe or Paytm. It's shown only to
        the collector on your completed pickup.
      </p>

      {saved === null ? (
        <p className="text-sm text-inkFaint">Loading…</p>
      ) : showForm ? (
        <form onSubmit={save}>
          {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}
          <label className="field-label" htmlFor="upi-id">Your UPI ID</label>
          <input
            id="upi-id"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="name@okhdfcbank"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="field-input mb-3"
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50">
              {busy ? "Saving…" : "Save UPI ID"}
            </button>
            {saved && (
              <button type="button" onClick={() => { setEditing(false); setError(""); }} className="text-sm font-semibold text-inkSoft hover:text-ink">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-inkFaint mb-1">UPI ID</div>
            <div className="font-mono text-sm text-ink">{maskUpi(saved)}</div>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => { setValue(saved); setEditing(true); setError(""); }} className="text-sm font-semibold text-rust hover:underline">
              Change
            </button>
            <button type="button" onClick={remove} disabled={busy} className="text-sm font-semibold text-inkFaint hover:text-danger disabled:opacity-50">
              Remove
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}