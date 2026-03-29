import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      setLoading(true);
      const res = await loginUser(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      if (res.data.user.role === "collector") navigate("/collector");
      else navigate("/");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes riseUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes floatA   { 0%,100% { transform:translateY(0) scale(1); }   50% { transform:translateY(-22px) scale(1.05); } }
        @keyframes floatB   { 0%,100% { transform:translateY(0) scale(1); }   50% { transform:translateY(18px)  scale(0.96); } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes gridMove { from { transform:translateY(0); } to { transform:translateY(60px); } }

        * { box-sizing:border-box; margin:0; padding:0; }

        .login-input {
          width:100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 13px;
          color: #F1F5F9;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          outline: none;
          transition: all 0.22s ease;
          caret-color: #22D3EE;
        }
        .login-input::placeholder { color: #334155; }
        .login-input:hover  { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
        .login-input:focus  { border-color: rgba(34,211,238,0.5); background: rgba(34,211,238,0.04); box-shadow: 0 0 0 3px rgba(34,211,238,0.08); }
        .login-input.error  { border-color: rgba(239,68,68,0.5) !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.07) !important; }

        .submit-btn {
          width:100%; padding:15px;
          border-radius:13px; border:none;
          background: linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(99,102,241,0.15) 100%);
          border: 1.5px solid rgba(34,211,238,0.35);
          color: #22D3EE;
          font-size:15px; font-weight:700;
          font-family:'Syne', sans-serif;
          letter-spacing:0.01em;
          cursor:pointer;
          transition:all 0.25s ease;
          display:flex; align-items:center; justify-content:center; gap:10px;
          box-shadow: 0 0 30px rgba(34,211,238,0.1);
        }
        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(34,211,238,0.26) 0%, rgba(99,102,241,0.22) 100%);
          box-shadow: 0 0 50px rgba(34,211,238,0.2);
          transform: translateY(-2px);
        }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        .register-link { color:#64748B; cursor:pointer; transition:color 0.2s; font-weight:500; }
        .register-link:hover { color:#22D3EE; text-decoration:underline; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #060A12 0%, #0A1020 55%, #060A12 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Animated grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          animation: "gridMove 8s linear infinite",
          pointerEvents: "none",
        }} />

        {/* Ambient orbs */}
        <div style={{ position:"absolute", top:"-10%", left:"-8%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 65%)", animation:"floatA 11s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-10%", right:"-8%", width:"450px", height:"450px", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)", animation:"floatB 14s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"600px", height:"300px", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(34,211,238,0.03) 0%, transparent 70%)", pointerEvents:"none" }} />

        {/* Card */}
        <div style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: "420px",
          background: "rgba(12,18,30,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "40px 36px",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "riseUp 0.5s ease both",
        }}>

          {/* Top accent line */}
          <div style={{
            position:"absolute", top:0, left:"20%", right:"20%",
            height:"1.5px",
            background:"linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)",
            borderRadius:"24px 24px 0 0",
          }} />

          {/* Logo mark */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"32px", animation:"riseUp 0.5s 0.05s ease both" }}>
            <div style={{
              width:"52px", height:"52px", borderRadius:"15px",
              background:"linear-gradient(135deg, rgba(34,211,238,0.2), rgba(99,102,241,0.15))",
              border:"1px solid rgba(34,211,238,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center",
              marginBottom:"16px",
              boxShadow:"0 0 30px rgba(34,211,238,0.15)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </div>
            <h1 style={{
              fontSize:"22px", fontWeight:800,
              fontFamily:"'Syne', sans-serif",
              letterSpacing:"-0.02em",
              background:"linear-gradient(90deg, #F8FAFC 0%, #94A3B8 100%)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              marginBottom:"4px",
            }}>
              ScrapConnect
            </h1>
            <p style={{ fontSize:"13px", color:"#475569", fontWeight:400 }}>Sign in to your account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              display:"flex", alignItems:"center", gap:"9px",
              padding:"11px 14px",
              borderRadius:"11px",
              background:"rgba(239,68,68,0.1)",
              border:"1px solid rgba(239,68,68,0.3)",
              marginBottom:"20px",
              animation:"shake 0.4s ease, fadeIn 0.25s ease",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" style={{flexShrink:0}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize:"13px", color:"#EF4444", fontWeight:500 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <div style={{ display:"flex", flexDirection:"column", gap:"14px", animation:"riseUp 0.5s 0.1s ease both" }}>

            {/* Email */}
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:600, color: focused==="email" ? "#22D3EE" : "#475569", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:"7px", transition:"color 0.2s" }}>
                Email
              </label>
              <div style={{ position:"relative" }}>
                <span style={{
                  position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)",
                  color: focused==="email" ? "#22D3EE" : "#334155",
                  display:"flex", transition:"color 0.2s",
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`login-input${error ? " error" : ""}`}
                  style={{ paddingLeft:"42px" }}
                  onFocus={() => { setFocused("email"); setError(""); }}
                  onBlur={() => setFocused("")}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display:"block", fontSize:"12px", fontWeight:600, color: focused==="password" ? "#22D3EE" : "#475569", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:"7px", transition:"color 0.2s" }}>
                Password
              </label>
              <div style={{ position:"relative" }}>
                <span style={{
                  position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)",
                  color: focused==="password" ? "#22D3EE" : "#334155",
                  display:"flex", transition:"color 0.2s",
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  className={`login-input${error ? " error" : ""}`}
                  style={{ paddingLeft:"42px", paddingRight:"46px" }}
                  onFocus={() => { setFocused("password"); setError(""); }}
                  onBlur={() => setFocused("")}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer",
                    color: showPass ? "#22D3EE" : "#334155",
                    display:"flex", padding:"4px",
                    transition:"color 0.2s",
                  }}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div style={{ marginTop:"6px" }}>
              <button className="submit-btn" onClick={handleLogin} disabled={loading}>
                {loading ? (
                  <>
                    <div style={{ width:"17px", height:"17px", border:"2px solid rgba(34,211,238,0.3)", borderTop:"2px solid #22D3EE", borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"24px 0" }}>
            <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize:"12px", color:"#1E293B", fontWeight:500 }}>OR</span>
            <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.06)" }} />
          </div>

          {/* Register */}
          <p style={{ textAlign:"center", fontSize:"13.5px", color:"#334155", fontWeight:400 }}>
            Don't have an account?{" "}
            <span className="register-link" onClick={() => navigate("/register")}>
              Create one
            </span>
          </p>

        </div>
      </div>
    </>
  );
}