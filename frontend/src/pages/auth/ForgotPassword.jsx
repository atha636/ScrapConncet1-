import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../services/authService";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import AuthSidePanel from "../../components/auth/AuthSidePanel";

export default function ForgotPassword() {
  useDocumentMeta({ title: "Reset Password" });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      // Backend always responds success regardless of whether the email
      // exists — this UI mirrors that on purpose, never revealing whether
      // an account exists for the entered address.
      setSent(true);
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <AuthSidePanel variant="login" />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo-mark.png" alt="" className="w-14 h-14 rounded-ticket mb-4 rotate-[-3deg]" />
            <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Reset your password</h1>
            <p className="text-sm text-inkSoft mt-1 text-center">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <div className="ticket p-8 pt-9">
            {sent ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full border-2 border-dashed border-amber flex items-center justify-center text-amber rotate-[-4deg]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v16H4z" opacity="0" /><path d="M22 6l-10 7L2 6" /><path d="M2 6h20v12H2z" />
                  </svg>
                </div>
                <h2 className="font-display font-semibold text-ink mb-2">Check your email</h2>
                <p className="text-sm text-inkSoft leading-relaxed">
                  If an account exists for <span className="font-medium text-ink">{email}</span>, a reset
                  link is on its way. It expires in 1 hour.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <p className="text-sm text-danger mb-4">{error}</p>}

                <div className="mb-6">
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-inkSoft mt-6">
              <Link to="/login" className="text-rust font-semibold hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}