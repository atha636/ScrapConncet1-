import { useState } from "react";
import { registerUser } from "../../services/authService";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import AuthSidePanel from "../../components/auth/AuthSidePanel";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../utils/roleHome";

const ROLE_FROM_PARAM = { user: false, collector: true };

export default function Register() {
  useDocumentMeta({
    title: "Sign Up",
    description:
      "Create a free ScrapConnect account as a requester to sell scrap, or as a collector to find pickup jobs nearby and earn.",
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

 
  const presetRole = ROLE_FROM_PARAM[searchParams.get("role")];
  const [step, setStep] = useState(presetRole !== undefined ? "form" : "choose");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    wantsToBeCollector: presetRole ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Same reasoning as Login — an already-signed-in visitor should never see
  // the signup form, just land on their own dashboard. All hooks above run
  // unconditionally first; this early return comes after, per Rules of Hooks.
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const chooseRole = (wantsToBeCollector) => {
    setForm({ ...form, wantsToBeCollector });
    setStep("form");
  };

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
      <div className="min-h-screen flex">
        <AuthSidePanel variant="register" />
        <div className="flex-1 flex items-center justify-center px-6">
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
      </div>
    );
  }

  // --- Step 1: choose a role ---
  if (step === "choose") {
    return (
      <div className="min-h-screen flex">
        <AuthSidePanel variant="register" />

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">
            <div className="flex flex-col items-center mb-10">
              <div className="w-14 h-14 rounded-ticket bg-rust flex items-center justify-center mb-4 rotate-[-3deg] lg:hidden">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2">
                  <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink tracking-tight">How will you use ScrapConnect?</h1>
              <p className="text-sm text-inkSoft mt-1">You can always tell us more on the next step.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => chooseRole(false)}
                className="text-left ticket p-6 hover:border-rust hover:-translate-y-1 transition-all group"
              >
                <div className="w-11 h-11 rounded-full bg-rust/10 text-rust flex items-center justify-center mb-4 group-hover:bg-rust group-hover:text-surface transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="font-display font-semibold text-ink mb-1.5">I have scrap to sell</div>
                <p className="text-sm text-inkSoft leading-relaxed">
                  Post a pickup request and get matched with a collector nearby who'll pay you for it.
                </p>
                <div className="text-sm font-semibold text-rust mt-4 flex items-center gap-1">
                  Continue as requester
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </button>

              <button
                onClick={() => chooseRole(true)}
                className="text-left ticket p-6 hover:border-amber hover:-translate-y-1 transition-all group"
              >
                <div className="w-11 h-11 rounded-full bg-amber/15 text-amber-dark flex items-center justify-center mb-4 group-hover:bg-amber group-hover:text-surface transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div className="font-display font-semibold text-ink mb-1.5">I want to collect scrap</div>
                <p className="text-sm text-inkSoft leading-relaxed">
                  Browse pickup requests near you, accept jobs, and get paid directly for each pickup.
                </p>
                <div className="text-sm font-semibold text-amber-dark mt-4 flex items-center gap-1">
                  Continue as collector
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-inkSoft mt-8">
              Already have an account?{" "}
              <button type="button" onClick={() => navigate("/login")} className="text-rust font-semibold hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 2: the actual form, role already decided ---
  return (
    <div className="min-h-screen flex">
      <AuthSidePanel variant="register" />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-ticket bg-rust flex items-center justify-center mb-4 rotate-[-3deg] lg:hidden">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2">
                <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Create your account</h1>
            <p className="text-sm text-inkSoft mt-1">Join ScrapConnect</p>
          </div>

          {/* Chosen role, with a way back to change it */}
          <button
            type="button"
            onClick={() => setStep("choose")}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-ticket border-1.5 mb-5 ${
              form.wantsToBeCollector ? "border-amber/50 bg-amber/[0.06]" : "border-rust/40 bg-rust/[0.05]"
            }`}
            style={{ borderWidth: "1.5px" }}
          >
            <div className="flex items-center gap-2.5 text-left">
              <span className={form.wantsToBeCollector ? "text-amber-dark" : "text-rust"}>
                {form.wantsToBeCollector ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">
                  Signing up as {form.wantsToBeCollector ? "a Collector" : "a Requester"}
                </div>
                <div className="text-xs text-inkFaint">
                  {form.wantsToBeCollector ? "Pick up & earn" : "Schedule pickups"}
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-rust shrink-0">Change</span>
          </button>

          <form onSubmit={handleRegister} className="ticket p-8 pt-7">
            {error && (
              <div className="flex items-center gap-2 text-sm text-danger bg-[#8C2F1B]/[0.07] border border-[#8C2F1B]/30 rounded-md px-3 py-2.5 mb-5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

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
    </div>
  );
}