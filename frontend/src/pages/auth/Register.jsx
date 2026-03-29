import { useState } from "react";
import { registerUser } from "../../services/authService";
import { useNavigate } from "react-router-dom";

const ROLES = [
  {
    value: "user",
    label: "User",
    desc: "Schedule scrap pickups",
    color: "#22D3EE",
    dim: "rgba(34,211,238,0.12)",
    border: "rgba(34,211,238,0.3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    value: "collector",
    label: "Collector",
    desc: "Pick up & earn money",
    color: "#F59E0B",
    dim: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
];

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState("");
  const [strength, setStrength] = useState(0);

  const handleChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === "password") calcStrength(value);
  };

  const calcStrength = (val) => {
    let s = 0;
    if (val.length >= 6) s++;
    if (val.length >= 10) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setStrength(s);
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][strength];
  const strengthColor = ["", "#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#22D3EE"][strength];

  const handleRegister = async () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your full name.");
    if (!form.email.trim()) return setError("Please enter a valid email.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");

    try {
      setLoading(true);
      await registerUser(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError("Registration failed. This email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleRegister(); };

  // ── Success Screen ──
  if (success) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
          @keyframes riseUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
          @keyframes scaleIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
          @keyframes ping    { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.8);opacity:0} }
          * { box-sizing:border-box; margin:0; padding:0; }
        `}</style>
        <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#060A12 0%,#0A1020 55%,#060A12 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:"24px" }}>
          <div style={{ textAlign:"center", animation:"riseUp 0.5s ease both" }}>
            <div style={{ position:"relative", width:"88px", height:"88px", margin:"0 auto 24px" }}>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(16,185,129,0.2)", animation:"ping 1.2s ease-out infinite" }} />
              <div style={{ width:"88px", height:"88px", borderRadius:"24px", background:"rgba(16,185,129,0.15)", border:"1.5px solid rgba(16,185,129,0.4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#10B981", animation:"scaleIn 0.4s 0.1s ease both" }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <h2 style={{ fontSize:"26px", fontWeight:800, color:"#F8FAFC", fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em", marginBottom:"8px" }}>Account Created!</h2>
            <p style={{ fontSize:"14px", color:"#64748B" }}>Redirecting you to login…</p>
          </div>
        </div>
      </>
    );
  }

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes riseUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes floatA  { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-20px) scale(1.04)} }
        @keyframes floatB  { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(16px) scale(0.96)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes gridMove{ from{transform:translateY(0)} to{transform:translateY(60px)} }

        * { box-sizing:border-box; margin:0; padding:0; }

        .reg-input {
          width:100%; padding:13px 16px;
          background:rgba(255,255,255,0.04);
          border:1.5px solid rgba(255,255,255,0.09);
          border-radius:12px; color:#F1F5F9;
          font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; transition:all 0.22s ease;
          caret-color:#22D3EE;
        }
        .reg-input::placeholder { color:#334155; }
        .reg-input:hover  { border-color:rgba(255,255,255,0.15); background:rgba(255,255,255,0.05); }
        .reg-input:focus  { border-color:rgba(34,211,238,0.5); background:rgba(34,211,238,0.04); box-shadow:0 0 0 3px rgba(34,211,238,0.08); }
        .reg-input.err    { border-color:rgba(239,68,68,0.5) !important; box-shadow:0 0 0 3px rgba(239,68,68,0.07) !important; }

        .submit-btn {
          width:100%; padding:15px; border-radius:13px; border:none;
          background:linear-gradient(135deg,rgba(34,211,238,0.18) 0%,rgba(99,102,241,0.15) 100%);
          border:1.5px solid rgba(34,211,238,0.35);
          color:#22D3EE; font-size:15px; font-weight:700;
          font-family:'Syne',sans-serif; letter-spacing:0.01em;
          cursor:pointer; transition:all 0.25s ease;
          display:flex; align-items:center; justify-content:center; gap:10px;
          box-shadow:0 0 30px rgba(34,211,238,0.1);
        }
        .submit-btn:hover:not(:disabled) { background:linear-gradient(135deg,rgba(34,211,238,0.26) 0%,rgba(99,102,241,0.22) 100%); box-shadow:0 0 50px rgba(34,211,238,0.2); transform:translateY(-2px); }
        .submit-btn:disabled { opacity:0.45; cursor:not-allowed; transform:none; }

        .login-link { color:#64748B; cursor:pointer; transition:color 0.2s; font-weight:500; }
        .login-link:hover { color:#22D3EE; text-decoration:underline; }
      `}</style>

      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(160deg,#060A12 0%,#0A1020 55%,#060A12 100%)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'DM Sans',sans-serif", padding:"24px",
        position:"relative", overflow:"hidden",
      }}>
        {/* Grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px)", backgroundSize:"60px 60px", animation:"gridMove 8s linear infinite", pointerEvents:"none" }} />

        {/* Orbs */}
        <div style={{ position:"absolute", top:"-10%", left:"-8%", width:"480px", height:"480px", borderRadius:"50%", background:"radial-gradient(circle,rgba(34,211,238,0.07) 0%,transparent 65%)", animation:"floatA 11s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-10%", right:"-8%", width:"420px", height:"420px", borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)", animation:"floatB 14s ease-in-out infinite", pointerEvents:"none" }} />

        {/* Card */}
        <div style={{
          position:"relative", zIndex:1,
          width:"100%", maxWidth:"440px",
          background:"rgba(12,18,30,0.85)",
          backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
          border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"24px", padding:"36px 34px",
          boxShadow:"0 40px 100px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04)",
          animation:"riseUp 0.5s ease both",
        }}>

          {/* Top accent */}
          <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:"1.5px", background:"linear-gradient(90deg,transparent,rgba(34,211,238,0.6),transparent)", borderRadius:"24px 24px 0 0" }} />

          {/* Header */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"28px", animation:"riseUp 0.5s 0.05s ease both" }}>
            <div style={{ width:"50px", height:"50px", borderRadius:"14px", background:"linear-gradient(135deg,rgba(34,211,238,0.2),rgba(99,102,241,0.15))", border:"1px solid rgba(34,211,238,0.3)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px", boxShadow:"0 0 30px rgba(34,211,238,0.15)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </div>
            <h1 style={{ fontSize:"21px", fontWeight:800, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em", background:"linear-gradient(90deg,#F8FAFC 0%,#94A3B8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"3px" }}>
              Create Account
            </h1>
            <p style={{ fontSize:"13px", color:"#475569" }}>Join ScrapConnect today</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display:"flex", alignItems:"center", gap:"9px", padding:"11px 14px", borderRadius:"11px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", marginBottom:"18px", animation:"shake 0.4s ease,fadeIn 0.25s ease" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" style={{flexShrink:0}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize:"13px", color:"#EF4444", fontWeight:500 }}>{error}</span>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:"14px", animation:"riseUp 0.5s 0.1s ease both" }}>

            {/* Role selector */}
            <div>
              <label style={{ display:"block", fontSize:"11.5px", fontWeight:600, color:"#475569", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"9px" }}>I am a</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"9px" }}>
                {ROLES.map((role) => {
                  const active = form.role === role.value;
                  return (
                    <button
                      key={role.value}
                      onClick={() => { setForm({ ...form, role: role.value }); setError(""); }}
                      style={{
                        position:"relative",
                        padding:"14px 12px",
                        borderRadius:"13px",
                        border: active ? `1.5px solid ${role.border}` : "1.5px solid rgba(255,255,255,0.07)",
                        background: active ? role.dim : "rgba(255,255,255,0.03)",
                        cursor:"pointer",
                        textAlign:"left",
                        transition:"all 0.22s ease",
                        transform: active ? "translateY(-2px)" : "translateY(0)",
                        boxShadow: active ? `0 10px 30px rgba(0,0,0,0.4),0 0 0 1px ${role.border}` : "none",
                        outline:"none",
                      }}
                    >
                      {active && <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:"1.5px", background:`linear-gradient(90deg,transparent,${role.color},transparent)`, borderRadius:"13px 13px 0 0" }} />}
                      <div style={{ color: active ? role.color : "#334155", marginBottom:"8px", transition:"color 0.2s" }}>{role.icon}</div>
                      <div style={{ fontSize:"13.5px", fontWeight:700, color: active ? "#F1F5F9" : "#64748B", fontFamily:"'Syne',sans-serif", marginBottom:"2px", transition:"color 0.2s" }}>{role.label}</div>
                      <div style={{ fontSize:"11px", color: active ? "#475569" : "#1E293B", transition:"color 0.2s" }}>{role.desc}</div>
                      {active && (
                        <div style={{ position:"absolute", top:"10px", right:"10px", width:"18px", height:"18px", borderRadius:"50%", background:role.color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ display:"block", fontSize:"11.5px", fontWeight:600, color: focused==="name" ? "#22D3EE" : "#475569", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"7px", transition:"color 0.2s" }}>Full Name</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color: focused==="name" ? "#22D3EE" : "#334155", display:"flex", transition:"color 0.2s" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input name="name" placeholder="John Doe" className={`reg-input${error && !form.name ? " err" : ""}`} style={{ paddingLeft:"42px" }}
                  onFocus={() => { setFocused("name"); setError(""); }} onBlur={() => setFocused("")}
                  onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display:"block", fontSize:"11.5px", fontWeight:600, color: focused==="email" ? "#22D3EE" : "#475569", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"7px", transition:"color 0.2s" }}>Email</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color: focused==="email" ? "#22D3EE" : "#334155", display:"flex", transition:"color 0.2s" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input name="email" type="email" placeholder="you@example.com" className={`reg-input${error && !form.email ? " err" : ""}`} style={{ paddingLeft:"42px" }}
                  onFocus={() => { setFocused("email"); setError(""); }} onBlur={() => setFocused("")}
                  onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display:"block", fontSize:"11.5px", fontWeight:600, color: focused==="password" ? "#22D3EE" : "#475569", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"7px", transition:"color 0.2s" }}>Password</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color: focused==="password" ? "#22D3EE" : "#334155", display:"flex", transition:"color 0.2s" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input name="password" type={showPass ? "text" : "password"} placeholder="Min. 6 characters" className={`reg-input${error && form.password.length < 6 ? " err" : ""}`} style={{ paddingLeft:"42px", paddingRight:"46px" }}
                  onFocus={() => { setFocused("password"); setError(""); }} onBlur={() => setFocused("")}
                  onChange={handleChange} onKeyDown={handleKeyDown} />
                <button onClick={() => setShowPass(!showPass)} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color: showPass ? "#22D3EE" : "#334155", display:"flex", padding:"4px", transition:"color 0.2s" }}>
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {/* Strength meter */}
              {form.password.length > 0 && (
                <div style={{ marginTop:"9px" }}>
                  <div style={{ display:"flex", gap:"4px", marginBottom:"5px" }}>
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} style={{ flex:1, height:"3px", borderRadius:"2px", background: i <= strength ? strengthColor : "rgba(255,255,255,0.07)", transition:"background 0.3s ease" }} />
                    ))}
                  </div>
                  <span style={{ fontSize:"11px", color: strengthColor, fontWeight:600, transition:"color 0.3s" }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ marginTop:"4px" }}>
              <button className="submit-btn" onClick={handleRegister} disabled={loading}>
                {loading ? (
                  <>
                    <div style={{ width:"17px", height:"17px", border:"2px solid rgba(34,211,238,0.3)", borderTop:"2px solid #22D3EE", borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"22px 0" }}>
            <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize:"12px", color:"#1E293B", fontWeight:500 }}>OR</span>
            <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.06)" }} />
          </div>

          <p style={{ textAlign:"center", fontSize:"13.5px", color:"#334155" }}>
            Already have an account?{" "}
            <span className="login-link" onClick={() => navigate("/login")}>Sign in</span>
          </p>
        </div>
      </div>
    </>
  );
}