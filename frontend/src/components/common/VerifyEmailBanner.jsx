import { useState } from "react";
import { resendVerification } from "../../services/authService";

export default function VerifyEmailBanner() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleResend = async () => {
    setStatus("sending");
    try {
      await resendVerification();
      setStatus("sent");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="bg-amber/10 border-b border-amber/30">
      <div className="max-w-5xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2 text-amber-dark">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M4 4h16v16H4z" opacity="0" /><path d="M22 6l-10 7L2 6" /><path d="M2 6h20v12H2z" />
          </svg>
          {status === "sent" ? (
            <span>Verification email sent — check your inbox.</span>
          ) : (
            <span>Please verify your email address.</span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {status !== "sent" && (
            <button
              onClick={handleResend}
              disabled={status === "sending"}
              className="font-semibold text-amber-dark hover:underline"
            >
              {status === "sending" ? "Sending…" : "Resend email"}
            </button>
          )}
          <button onClick={() => setDismissed(true)} className="text-inkFaint hover:text-ink" aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}