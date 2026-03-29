import { useEffect, useState } from "react";
import { getMyRequests } from "../../services/pickupService";
import Navbar from "../../components/layout/Navbar";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    dot: "#F59E0B",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  confirmed: {
    label: "Confirmed",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.35)",
    dot: "#10B981",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    color: "#6366F1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.35)",
    dot: "#6366F1",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    dot: "#EF4444",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
};

const SCRAP_ICONS = {
  default: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status,
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.3)",
    dot: "#94A3B8",
    icon: null,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 11px",
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: s.color, display: "flex", alignItems: "center" }}>{s.icon}</span>
      {s.label}
    </span>
  );
}

function RequestCard({ item, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: hovered
          ? "linear-gradient(135deg, rgba(30,35,45,0.98) 0%, rgba(26,31,41,1) 100%)"
          : "linear-gradient(135deg, rgba(22,27,37,0.95) 0%, rgba(18,23,33,1) 100%)",
        border: hovered ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "22px 24px",
        transition: "all 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.15)"
          : "0 4px 20px rgba(0,0,0,0.3)",
        animationDelay: `${index * 80}ms`,
        animationFillMode: "both",
        animationName: "fadeSlideUp",
        animationDuration: "0.5s",
        animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: hovered ? "100%" : "0%",
          height: "2px",
          background: "linear-gradient(90deg, #F59E0B, #F97316)",
          borderRadius: "16px 16px 0 0",
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        {/* Left: Icon + Info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: 0 }}>
          {/* Icon box */}
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.1))",
              border: "1px solid rgba(245,158,11,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F59E0B",
              flexShrink: 0,
              transition: "all 0.25s ease",
              ...(hovered && {
                background: "linear-gradient(135deg, rgba(245,158,11,0.28), rgba(249,115,22,0.18))",
                border: "1px solid rgba(245,158,11,0.45)",
              }),
            }}
          >
            {SCRAP_ICONS.default}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#F1F5F9",
                letterSpacing: "-0.01em",
                marginBottom: "4px",
                fontFamily: "'Syne', sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.scrapType || "Unknown Scrap"}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span style={{ fontSize: "12px", color: "#64748B", letterSpacing: "0.02em" }}>
                ID: {item._id?.slice(-8)?.toUpperCase() || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Status */}
        <div style={{ flexShrink: 0 }}>
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.05)",
          margin: "18px 0",
        }}
      />

      {/* Bottom row: price + meta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
          <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, letterSpacing: "0.05em" }}>PRICE</span>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#F59E0B",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "-0.03em",
              marginLeft: "6px",
            }}
          >
            ₹{Number(item.price || 0).toLocaleString("en-IN")}
          </span>
        </div>

        {item.createdAt && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: "12px", color: "#475569" }}>
              {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        gap: "16px",
        animation: "fadeSlideUp 0.5s ease both",
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "20px",
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F59E0B",
          opacity: 0.7,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </div>
      <p style={{ color: "#94A3B8", fontSize: "15px", fontWeight: 500, margin: 0 }}>No requests yet</p>
      <p style={{ color: "#475569", fontSize: "13px", margin: 0 }}>Your scrap pickup requests will appear here</p>
    </div>
  );
}

function SkeletonCard({ index }) {
  return (
    <div
      style={{
        background: "rgba(22,27,37,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
        padding: "22px 24px",
        animationDelay: `${index * 80}ms`,
        animationFillMode: "both",
        animationName: "fadeSlideUp",
        animationDuration: "0.4s",
        animationTimingFunction: "ease",
      }}
    >
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} className="shimmer" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, width: "55%", borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} className="shimmer" />
          <div style={{ height: 11, width: "30%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} className="shimmer" />
        </div>
        <div style={{ height: 24, width: 80, borderRadius: 999, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} className="shimmer" />
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "18px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ height: 22, width: 90, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} className="shimmer" />
        <div style={{ height: 12, width: 70, borderRadius: 4, background: "rgba(255,255,255,0.04)" }} className="shimmer" />
      </div>
    </div>
  );
}

export default function MyRequests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRequests()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: data.length,
    pending: data.filter((d) => d.status?.toLowerCase() === "pending").length,
    completed: data.filter((d) => d.status?.toLowerCase() === "completed").length,
    totalValue: data.reduce((sum, d) => sum + Number(d.price || 0), 0),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerAnim {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.09) 80px, rgba(255,255,255,0.04) 160px) !important;
          background-size: 400px !important;
          animation: shimmerAnim 1.6s infinite linear !important;
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.25); border-radius: 4px; }
      `}</style>

      

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg, #0B0F1A 0%, #0F1420 50%, #0B0F1A 100%)",
          fontFamily: "'DM Sans', sans-serif",
          paddingBottom: "60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "40px 24px 0",
            maxWidth: "720px",
            margin: "0 auto",
            animation: "fadeSlideUp 0.45s ease both",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "32px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <div style={{ width: "3px", height: "22px", background: "linear-gradient(180deg, #F59E0B, #F97316)", borderRadius: "2px" }} />
                <h1
                  style={{
                    margin: 0,
                    fontSize: "26px",
                    fontWeight: 800,
                    color: "#F8FAFC",
                    fontFamily: "'Syne', sans-serif",
                    letterSpacing: "-0.02em",
                  }}
                >
                  My Requests
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#64748B", fontWeight: 400 }}>
                Track all your scrap pickup requests
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "10px",
                color: "#F59E0B",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              {loading ? "—" : stats.total} {stats.total === 1 ? "Request" : "Requests"}
            </div>
          </div>

          {/* Stats Row */}
          {!loading && data.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "28px",
                animation: "fadeSlideUp 0.5s 0.1s ease both",
              }}
            >
              {[
                { label: "Pending", value: stats.pending, color: "#F59E0B" },
                { label: "Completed", value: stats.completed, color: "#6366F1" },
                { label: "Total Value", value: `₹${Number(stats.totalValue).toLocaleString("en-IN")}`, color: "#10B981" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "rgba(22,27,37,0.8)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "3px" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cards */}
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} index={i} />)
            : data.length === 0
            ? <EmptyState />
            : data.map((item, i) => <RequestCard key={item._id} item={item} index={i} />)
          }
        </div>
      </div>
    </>
  );
}