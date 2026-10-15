import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createTripShare, stopTripShare, raiseSos } from "../../services/safetyService";
import ErrorBox from "../common/ErrorBox";

const HOLD_MS = 1500;
const LIVE = ["accepted", "in_progress"];

const tripUrl = (token) => `${window.location.origin}/trip/${token}`;

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 }
    );
  });
}

function Sheet({ open, onClose, title, children }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="ticket w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-ticket"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
              <button type="button" onClick={onClose} className="text-inkFaint hover:text-ink text-xl leading-none" aria-label="Close">×</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ShareSheet({ pickupId, open, onClose }) {
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    createTripShare(pickupId)
      .then((res) => alive && (setToken(res.data.token), setError("")))
      .catch((err) => alive && setError(err.response?.data?.message || "Couldn't create a link right now."));
    return () => { alive = false; };
  }, [open, pickupId]);

  const url = token ? tripUrl(token) : "";
  const text = `Follow my ScrapConnect pickup live: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await stopTripShare(pickupId);
      setToken(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't stop sharing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Share this trip">
      <p className="text-sm text-inkSoft mb-4">
        Send this link to someone you trust. They can follow the pickup live — no account needed. It shows a
        first name and live status only, never phone numbers or your address.
      </p>
      {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}
      {token ? (
        <>
          <input readOnly value={url} onFocus={(e) => e.target.select()} className="field-input text-xs font-mono mb-3" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button type="button" onClick={copy} className="btn-secondary !py-2 text-sm">{copied ? "Copied ✓" : "Copy link"}</button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !py-2 text-sm text-center"
            >
              WhatsApp
            </a>
          </div>
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              type="button"
              onClick={() => navigator.share({ title: "ScrapConnect pickup", text: "Follow my pickup live", url }).catch(() => {})}
              className="btn-secondary !py-2 text-sm w-full mb-3"
            >
              More ways to share…
            </button>
          )}
          <button type="button" onClick={stop} disabled={busy} className="text-xs font-semibold text-danger hover:underline disabled:opacity-50">
            {busy ? "Stopping…" : "Stop sharing (link stops working)"}
          </button>
        </>
      ) : (
        !error && <p className="text-sm text-inkFaint">Creating your link…</p>
      )}
    </Sheet>
  );
}

function HelplineButtons() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href="tel:112" className="rounded-lg bg-danger text-surface text-center py-2.5 text-sm font-bold">Call 112</a>
      <a href="tel:100" className="rounded-lg border border-danger/40 text-danger text-center py-2.5 text-sm font-bold">Police 100</a>
    </div>
  );
}

function SosSheet({ pickupId, open, onClose }) {
  const [note, setNote] = useState("");
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToken, setSentToken] = useState(null);
  const [error, setError] = useState("");
  const timer = useRef(null);

  const cancelHold = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };

  const send = async () => {
    setHolding(false);
    setSending(true);
    setError("");
    try {
      const pos = await getPosition();
      const res = await raiseSos(pickupId, { ...(pos || {}), ...(note.trim() ? { note: note.trim() } : {}) });
      setSentToken(res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the alert. If you're in danger, call 112 now.");
    } finally {
      setSending(false);
    }
  };

  const startHold = () => {
    if (sending || sentToken) return;
    setHolding(true);
    timer.current = setTimeout(send, HOLD_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const close = () => {
    cancelHold();
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={sentToken ? "Alert sent" : "Emergency help"}>
      {sentToken ? (
        <>
          <div className="rounded-lg bg-rust/[0.06] border border-rust/30 p-3 mb-4 text-sm text-ink">
            The ScrapConnect safety team has been alerted with your location. Stay somewhere safe.
          </div>
          <p className="text-xs text-inkSoft mb-2">If you're in immediate danger, call for help now:</p>
          <HelplineButtons />
          <p className="text-xs text-inkSoft mt-4 mb-1.5">A trip link was also created — send it to someone you trust:</p>
          <input readOnly value={tripUrl(sentToken)} onFocus={(e) => e.target.select()} className="field-input text-xs font-mono" />
        </>
      ) : (
        <>
          <p className="text-sm text-inkSoft mb-3">
            Press and hold the button for a moment to alert the ScrapConnect safety team with your live
            location. The other person on this pickup is not notified.
          </p>
          {error && <div className="mb-3"><ErrorBox>{error}</ErrorBox></div>}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Optional: what's happening?"
            className="field-input text-sm mb-3"
          />
          <button
            type="button"
            disabled={sending}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") cancelHold(); }}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-full overflow-hidden rounded-xl bg-danger text-surface font-display font-bold py-4 text-base select-none touch-none disabled:opacity-60"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 bg-ink/35 origin-left"
              initial={false}
              animate={{ scaleX: holding ? 1 : 0 }}
              transition={{ duration: holding ? HOLD_MS / 1000 : 0.15, ease: "linear" }}
            />
            <span className="relative">{sending ? "Sending alert…" : holding ? "Keep holding…" : "Hold to send SOS"}</span>
          </button>
          <p className="text-xs text-inkFaint mt-4 mb-2">Need help right now? Call directly:</p>
          <HelplineButtons />
        </>
      )}
    </Sheet>
  );
}

export default function SafetyKit({ pickup }) {
  const [sheet, setSheet] = useState(null); // "share" | "sos" | null
  if (!pickup || !LIVE.includes(pickup.status)) return null;

  return (
    <>
      <div className="rounded-md border border-line bg-surface p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-rust">
            <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z" />
          </svg>
          Safety
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setSheet("share")} className="btn-secondary !py-2 !px-3 text-xs">Share trip</button>
          <button
            type="button"
            onClick={() => setSheet("sos")}
            className="rounded-lg border border-danger/50 text-danger hover:bg-danger hover:text-surface transition-colors text-xs font-bold py-2"
          >
            SOS
          </button>
        </div>
      </div>
      <ShareSheet pickupId={pickup._id} open={sheet === "share"} onClose={() => setSheet(null)} />
      <SosSheet pickupId={pickup._id} open={sheet === "sos"} onClose={() => setSheet(null)} />
    </>
  );
}