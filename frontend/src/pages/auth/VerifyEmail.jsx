import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../../services/authService";
import useDocumentMeta from "../../hooks/useDocumentMeta";

export default function VerifyEmail() {
  useDocumentMeta({ title: "Verify Email" });

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // "verifying" | "success" | "error"
  const [status, setStatus] = useState(token ? "verifying" : "error");
  const [error, setError] = useState(token ? "" : "This verification link is missing its token.");

  useEffect(() => {
    if (!token) return;

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err.response?.data?.message || "This verification link is invalid or has expired.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="text-center max-w-sm">
        {status === "verifying" && (
          <>
            <div className="w-8 h-8 border-[2.5px] border-line border-t-rust rounded-full animate-spin mx-auto mb-5" />
            <p className="text-sm text-inkSoft">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed border-amber flex items-center justify-center text-amber rotate-[-4deg]">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mb-3">Email verified</h1>
            <p className="text-sm text-inkSoft leading-relaxed mb-8">
              Your email is confirmed. You're all set.
            </p>
            <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed border-danger/50 flex items-center justify-center text-danger rotate-[-4deg]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mb-3">Verification failed</h1>
            <p className="text-sm text-inkSoft leading-relaxed mb-8">{error}</p>
            <Link to="/login" className="btn-primary inline-flex">Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}