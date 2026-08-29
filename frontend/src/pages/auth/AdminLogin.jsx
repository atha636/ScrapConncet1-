import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import useDocumentMeta from "../../hooks/useDocumentMeta";

export default function AdminLogin() {
  useDocumentMeta({ title: "Admin Portal", noindex: true });

  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await loginUser(form);

      if (res.data.user.role !== "admin") {
        // Deliberately vague — doesn't confirm whether the account exists
        // or what role it actually has, and never persists a session for it.
        setError("This account doesn't have admin access.");
        return;
      }

      login(res.data.token, res.data.user);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-ink">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-ticket bg-surface flex items-center justify-center mb-4 rotate-[-3deg]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#241A12" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-surface tracking-tight">Admin Portal</h1>
          <p className="text-sm text-surface/60 mt-1">Restricted access</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surfaceRaised border border-line rounded-lg p-8">
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/[0.07] border border-danger/30 rounded-md px-3 py-2.5 mb-5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="field-label">Admin email</label>
            <input
              type="email"
              required
              placeholder="admin@example.com"
              className="field-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="mb-6">
            <label className="field-label">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                placeholder="Enter your password"
                className="field-input pr-11"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-inkFaint hover:text-rust transition-colors"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Verifying…" : "Access admin panel"}
          </button>

          <p className="text-center text-xs text-inkFaint mt-6">
            Not an admin? <Link to="/login" className="text-rust font-semibold hover:underline">Go to regular sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}