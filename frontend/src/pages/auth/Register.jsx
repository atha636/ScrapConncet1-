import { useState } from "react";
import { registerUser } from "../../services/authService";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    wantsToBeCollector: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    try {
      setLoading(true);
      await registerUser(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1600);
    } catch (err) {
      const details = err.response?.data?.details;
      setError(
        details?.[0]?.message ||
          err.response?.data?.message ||
          "Registration failed. This email may already be in use."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed border-amber flex items-center justify-center text-amber rotate-[-4deg]">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-ink mb-2">Account created</h2>
          <p className="text-sm text-inkSoft">Taking you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-ticket bg-rust flex items-center justify-center mb-4 rotate-[-3deg]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2">
              <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Create account</h1>
          <p className="text-sm text-inkSoft mt-1">Join ScrapConnect</p>
        </div>

        <form onSubmit={handleRegister} className="ticket p-8 pt-9">
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-[#8C2F1B]/[0.07] border border-[#8C2F1B]/30 rounded-md px-3 py-2.5 mb-5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Role toggle — sends wantsToBeCollector, never a raw role */}
          <div className="mb-4">
            <label className="field-label">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, wantsToBeCollector: false })}
                className={`text-left p-3.5 rounded-ticket border-1.5 transition-all ${
                  !form.wantsToBeCollector
                    ? "border-rust bg-rust/[0.06] -translate-y-0.5"
                    : "border-line bg-surfaceRaised"
                }`}
                style={{ borderWidth: "1.5px" }}
              >
                <div className={!form.wantsToBeCollector ? "text-rust mb-2" : "text-inkFaint mb-2"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="font-display font-semibold text-sm text-ink">Requester</div>
                <div className="text-xs text-inkFaint mt-0.5">Schedule pickups</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, wantsToBeCollector: true })}
                className={`text-left p-3.5 rounded-ticket border-1.5 transition-all ${
                  form.wantsToBeCollector
                    ? "border-amber bg-amber/[0.08] -translate-y-0.5"
                    : "border-line bg-surfaceRaised"
                }`}
                style={{ borderWidth: "1.5px" }}
              >
                <div className={form.wantsToBeCollector ? "text-amber-dark mb-2" : "text-inkFaint mb-2"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div className="font-display font-semibold text-sm text-ink">Collector</div>
                <div className="text-xs text-inkFaint mt-0.5">Pick up & earn</div>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="field-label">Full name</label>
            <input name="name" required placeholder="Your name" className="field-input" onChange={handleChange} />
          </div>

          <div className="mb-4">
            <label className="field-label">Email</label>
            <input name="email" type="email" required placeholder="you@example.com" className="field-input" onChange={handleChange} />
          </div>

          <div className="mb-4">
            <label className="field-label">Phone (optional)</label>
            <input name="phone" placeholder="10-digit number" className="field-input" onChange={handleChange} />
          </div>

          <div className="mb-6">
            <label className="field-label">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPass ? "text" : "password"}
                required
                placeholder="Min. 8 characters, 1 letter, 1 number"
                className="field-input pr-11"
                onChange={handleChange}
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
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm text-inkSoft mt-6">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} className="text-rust font-semibold hover:underline">
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
