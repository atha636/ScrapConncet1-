import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const CARDS = [
  {
    id: "pickup",
    title: "Request Pickup",
    desc: "Schedule a scrap pickup easily",
    accent: "#22D3EE",
    accentDim: "rgba(34,211,238,0.12)",
    accentBorder: "rgba(34,211,238,0.3)",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    badge: "Quick Action",
    badgeColor: "#22D3EE",
    stat: null,
  },
  {
    id: "requests",
    title: "My Requests",
    desc: "Track your pickup status",
    accent: "#F59E0B",
    accentDim: "rgba(245,158,11,0.12)",
    accentBorder: "rgba(245,158,11,0.28)",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    badge: "Live Status",
    badgeColor: "#F59E0B",
    stat: null,
  },
  {
    id: "earnings",
    title: "Earnings",
    desc: "Estimated scrap value",
    accent: "#10B981",
    accentDim: "rgba(16,185,129,0.12)",
    accentBorder: "rgba(16,185,129,0.28)",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    badge: "This Month",
    badgeColor: "#10B981",
    stat: null,
  },
];

const ACTIVITY = [
  { label: "Pickup Confirmed", time: "2 hrs ago", color: "#10B981", icon: "✓" },
  { label: "Request Submitted", time: "Yesterday", color: "#F59E0B", icon: "●" },
  { label: "Scrap Collected", time: "3 days ago", color: "#22D3EE", icon: "↑" },
];

function ActionCard({ card, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: hovered
          ? `linear-gradient(135deg, rgba(28,34,46,0.98) 0%, rgba(22,28,40,1) 100%)`
          : "linear-gradient(135deg, rgba(20,26,38,0.95) 0%, rgba(16,22,34,1) 100%)",
        border: hovered ? `1px solid ${card.accentBorder}` : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px",
        padding: "28px 26px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${card.accentBorder}`
          : "0 4px 24px rgba(0,0,0,0.35)",
        animationName: "riseUp",
        animationDuration: "0.55s",
        animationDelay: `${index * 100}ms`,
        animationFillMode: "both",
        animationTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: "absolute",
        top: "-30px", right: "-30px",
        width: "120px", height: "120px",
        borderRadius: "50%",
        background: card.accentDim,
        filter: "blur(30px)",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
      }} />

      {/* Top stripe */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "2px",
        background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)`,
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.35s ease",
        borderRadius: "20px 20px 0 0",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "999px",
        background: card.accentDim,
        border: `1px solid ${card.accentBorder}`,
        color: card.accent,
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: "20px",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: card.accent, display: "inline-block" }} />
        {card.badge}
      </div>

      {/* Icon */}
      <div style={{
        width: "54px", height: "54px",
        borderRadius: "16px",
        background: card.accentDim,
        border: `1px solid ${card.accentBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: card.accent,
        marginBottom: "18px",
        transition: "all 0.25s ease",
        ...(hovered && { background: `rgba(${card.accent === "#22D3EE" ? "34,211,238" : card.accent === "#F59E0B" ? "245,158,11" : "16,185,129"},0.2)` }),
      }}>
        {card.icon}
      </div>

      <h3 style={{
        margin: "0 0 6px",
        fontSize: "18px",
        fontWeight: 800,
        color: "#F1F5F9",
        fontFamily: "'Syne', sans-serif",
        letterSpacing: "-0.01em",
      }}>
        {card.title}
      </h3>
      <p style={{
        margin: "0 0 22px",
        fontSize: "13.5px",
        color: "#64748B",
        fontWeight: 400,
        lineHeight: 1.5,
      }}>
        {card.desc}
      </p>

      {/* CTA */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontSize: "13px",
        fontWeight: 600,
        color: hovered ? card.accent : "#475569",
        transition: "color 0.25s ease",
      }}>
        Open
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transition: "transform 0.25s ease", transform: hovered ? "translateX(4px)" : "translateX(0)" }}
        >
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </div>
  );
}

function StatPill({ label, value, color, delay }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "4px",
      padding: "16px 20px",
      background: "rgba(20,26,38,0.8)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "14px",
      animationName: "riseUp",
      animationDuration: "0.5s",
      animationDelay: delay,
      animationFillMode: "both",
      animationTimingFunction: "ease",
      flex: 1,
    }}>
      <span style={{ fontSize: "20px", fontWeight: 800, color, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
        {value}
      </span>
      <span style={{ fontSize: "11px", color: "#475569", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [hour] = useState(new Date().getHours());

  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

        @keyframes riseUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-18px) scale(1.04); }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #080C14 0%, #0C1120 55%, #080C14 100%)",
        fontFamily: "'DM Sans', sans-serif",
        padding: "0 0 80px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient orbs */}
        <div style={{
          position: "absolute", top: "5%", right: "8%",
          width: "400px", height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)",
          animation: "floatOrb 9s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", left: "3%",
          width: "300px", height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
          animation: "floatOrb 12s ease-in-out infinite reverse",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 24px 0" }}>

          {/* ── Header ── */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "40px",
            animationName: "riseUp",
            animationDuration: "0.5s",
            animationFillMode: "both",
          }}>
            <div>
              <p style={{ margin: "0 0 5px", fontSize: "13px", color: "#475569", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {greeting}
              </p>
              <h1 style={{
                margin: 0,
                fontSize: "clamp(26px, 4vw, 34px)",
                fontWeight: 800,
                fontFamily: "'Syne', sans-serif",
                letterSpacing: "-0.03em",
                color: "#F8FAFC",
                lineHeight: 1.15,
              }}>
                {user?.name || "User"}
                <span style={{
                  display: "inline-block",
                  marginLeft: "10px",
                  fontSize: "28px",
                  animation: "floatOrb 2.5s ease-in-out infinite",
                }}>👋</span>
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#64748B", fontWeight: 400 }}>
                Here's what's happening with your scrap today.
              </p>
            </div>

            {/* Avatar */}
            <div style={{
              position: "relative",
              width: "52px", height: "52px",
            }}>
              <div style={{
                position: "absolute", inset: "-4px",
                borderRadius: "50%",
                border: "1.5px solid rgba(34,211,238,0.4)",
                animationName: "pulseRing",
                animationDuration: "2.5s",
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-out",
              }} />
              <div style={{
                width: "52px", height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(99,102,241,0.2))",
                border: "1.5px solid rgba(34,211,238,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
                color: "#22D3EE",
                fontFamily: "'Syne', sans-serif",
              }}>
                {(user?.name || "U")[0].toUpperCase()}
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "36px",
          }}>
            <StatPill label="Total Pickups" value="0" color="#22D3EE" delay="0.08s" />
            <StatPill label="Pending" value="0" color="#F59E0B" delay="0.14s" />
            <StatPill label="Earnings" value="₹0" color="#10B981" delay="0.20s" />
          </div>

          {/* ── Section label ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "20px",
            animationName: "riseUp",
            animationDuration: "0.5s",
            animationDelay: "0.22s",
            animationFillMode: "both",
          }}>
            <div style={{ width: "3px", height: "18px", background: "linear-gradient(180deg,#22D3EE,#6366F1)", borderRadius: "2px" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Quick Actions
            </span>
          </div>

          {/* ── Cards Grid ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "40px",
          }}>
            {CARDS.map((card, i) => (
              <ActionCard key={card.id} card={card} index={i} />
            ))}
          </div>

          {/* ── Recent Activity ── */}
          <div style={{
            background: "rgba(16,22,34,0.8)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px",
            padding: "24px 26px",
            animationName: "riseUp",
            animationDuration: "0.55s",
            animationDelay: "0.4s",
            animationFillMode: "both",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "3px", height: "18px", background: "linear-gradient(180deg,#F59E0B,#F97316)", borderRadius: "2px" }} />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#CBD5E1", fontFamily: "'Syne', sans-serif", letterSpacing: "0.01em" }}>
                  Recent Activity
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "#475569", fontWeight: 500, cursor: "pointer" }}>View all →</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {ACTIVITY.map((act, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    transition: "background 0.2s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "32px", height: "32px",
                      borderRadius: "10px",
                      background: `rgba(${act.color === "#10B981" ? "16,185,129" : act.color === "#F59E0B" ? "245,158,11" : "34,211,238"},0.12)`,
                      border: `1px solid rgba(${act.color === "#10B981" ? "16,185,129" : act.color === "#F59E0B" ? "245,158,11" : "34,211,238"},0.25)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px",
                      color: act.color,
                      fontWeight: 700,
                    }}>
                      {act.icon}
                    </div>
                    <span style={{ fontSize: "14px", color: "#CBD5E1", fontWeight: 500 }}>{act.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#475569" }}>{act.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}