import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import AuthSidePanel from "../../components/auth/AuthSidePanel";
import { roleHome } from "../../utils/roleHome";

export default function Login() {
  useDocumentMeta({
    title: "Log In",
    description: "Log in to ScrapConnect to request a scrap pickup or manage your collector jobs.",
  });

  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Already signed in? Skip the login form entirely — this is exactly what
  // caused the "logged-in navbar showing on top of the login page" bug: a
  // stale session should send you straight to your dashboard, never show
  // you the form for a state you're already past.
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await loginUser(form);
      login(res.data.token, res.data.user);
      navigate(roleHome(res.data.user.role));
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <AuthSidePanel />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mark */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-ticket bg-rust flex items-center justify-center mb-4 rotate-[-3deg] lg:hidden">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2">
                <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Welcome back</h1>
            <p className="text-sm text-inkSoft mt-1">Sign in to your account</p>
          </div>

          {/* Card */}
          <form onSubmit={handleLogin} className="ticket p-8 pt-9">
            {error && (
              <div className="flex items-center gap-2 text-sm text-danger bg-[#8C2F1B]/[0.07] border border-[#8C2F1B]/30 rounded-md px-3 py-2.5 mb-5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="field-label">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
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
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-sm text-inkSoft mt-6">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-rust font-semibold hover:underline"
              >
                Create one
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}