import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const USER_LINKS = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    to: "/request",
    label: "Request",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    to: "/my-requests",
    label: "My Requests",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

const COLLECTOR_LINKS = [
  {
    to: "/collector",
    label: "Collector",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.clear();
      setUser(null);
    }, 400);
  };

  const links = user?.role === "user" ? USER_LINKS : user?.role === "collector" ? COLLECTOR_LINKS : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .nav-link { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 10px; font-size: 13.5px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #64748B; text-decoration: none; transition: all 0.2s ease; white-space: nowrap; }
        .nav-link:hover { color: #CBD5E1; background: rgba(255,255,255,0.05); }
        .nav-link.active { color: #22D3EE; background: rgba(34,211,238,0.09); }
        .nav-link.active::after { content:''; position:absolute; bottom:-1px; left:50%; transform:translateX(-50%); width:20px; height:2px; background:#22D3EE; border-radius:2px; }

        .mob-link { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #64748B; text-decoration: none; transition: all 0.2s ease; }
        .mob-link:hover { color: #CBD5E1; background: rgba(255,255,255,0.05); }
        .mob-link.active { color: #22D3EE; background: rgba(34,211,238,0.09); }

        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeOut { to { opacity:0; } }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,12,20,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontFamily: "'DM Sans', sans-serif",
        animation: "slideDown 0.4s ease both",
      }}>
        <div style={{
          maxWidth: "1100px", margin: "0 auto",
          padding: "0 20px",
          height: "62px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "16px",
        }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "9px", flexShrink: 0 }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "9px",
              background: "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(99,102,241,0.2))",
              border: "1px solid rgba(34,211,238,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2.2">
                <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </div>
            <span style={{
              fontSize: "17px", fontWeight: 800,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "-0.02em",
              background: "linear-gradient(90deg, #F8FAFC 0%, #94A3B8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              ScrapConnect
            </span>
          </Link>

          {/* Desktop Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}
               className="desktop-nav">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link${location.pathname === link.to ? " active" : ""}`}
              >
                <span style={{ opacity: location.pathname === link.to ? 1 : 0.6, display: "flex" }}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>

            {/* User chip */}
            {user && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "5px 12px 5px 6px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(34,211,238,0.3), rgba(99,102,241,0.25))",
                  border: "1px solid rgba(34,211,238,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700, color: "#22D3EE",
                  fontFamily: "'Syne', sans-serif",
                }}>
                  {(user?.name || "U")[0].toUpperCase()}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#94A3B8", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.name || "User"}
                </span>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px",
                borderRadius: "10px",
                background: loggingOut ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                border: loggingOut ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.08)",
                color: loggingOut ? "#EF4444" : "#64748B",
                fontSize: "13px", fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                animation: loggingOut ? "fadeOut 0.4s ease forwards" : "none",
              }}
              onMouseEnter={e => { if (!loggingOut) { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#EF4444"; }}}
              onMouseLeave={e => { if (!loggingOut) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "none",
                width: "36px", height: "36px",
                borderRadius: "10px",
                background: menuOpen ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.04)",
                border: menuOpen ? "1px solid rgba(34,211,238,0.3)" : "1px solid rgba(255,255,255,0.08)",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: menuOpen ? "#22D3EE" : "#64748B",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              id="hamburger-btn"
            >
              {menuOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "10px 16px 16px",
            animation: "slideDown 0.25s ease both",
            background: "rgba(8,12,20,0.97)",
          }}>
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`mob-link${location.pathname === link.to ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span style={{ opacity: 0.7, display: "flex" }}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Responsive style injection */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          #hamburger-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}