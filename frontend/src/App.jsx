import { useState } from "react";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${
        darkMode ? "bg-[#04050f] text-white" : "bg-[#f5f3ef] text-[#1a1a2e]"
      }`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Google Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        /* Noise texture overlay */
        .noise::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: ${darkMode ? "0.04" : "0.035"};
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
        }

        /* Animated gradient orbs */
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 30px) scale(1.05); }
          66% { transform: translate(30px, -40px) scale(0.92); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 40px) scale(1.1); }
        }

        .orb-1 { animation: orb-drift-1 18s ease-in-out infinite; }
        .orb-2 { animation: orb-drift-2 22s ease-in-out infinite; }
        .orb-3 { animation: orb-drift-3 14s ease-in-out infinite; }

        /* Grid lines */
        .grid-bg {
          background-image: ${darkMode
            ? "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)"
            : "linear-gradient(rgba(109,40,217,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.06) 1px, transparent 1px)"
          };
          background-size: 60px 60px;
        }

        /* Theme toggle */
        .theme-toggle {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .theme-toggle:hover {
          transform: scale(1.06);
        }
        .theme-toggle:active {
          transform: scale(0.95);
        }
        .theme-toggle::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          pointer-events: none;
        }

        /* Shimmer line */
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .shimmer-line {
          position: relative;
          overflow: hidden;
        }
        .shimmer-line::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          animation: shimmer 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* === LAYERED BACKGROUND === */}
      <div className="fixed inset-0 -z-10 noise grid-bg overflow-hidden">

        {/* Deep base gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: darkMode
              ? "radial-gradient(ellipse 80% 60% at 50% -10%, #1a0533 0%, transparent 70%)"
              : "radial-gradient(ellipse 80% 60% at 50% -10%, #e9d5ff 0%, transparent 70%)",
          }}
        />

        {/* Orb 1 — top left */}
        <div
          className="orb-1 absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            top: -180,
            left: -160,
            background: darkMode
              ? "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Orb 2 — bottom right */}
        <div
          className="orb-2 absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            bottom: -160,
            right: -140,
            background: darkMode
              ? "radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />

        {/* Orb 3 — center accent */}
        <div
          className="orb-3 absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            top: "40%",
            left: "55%",
            background: darkMode
              ? "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        {/* Horizontal accent line */}
        <div
          className="absolute w-full shimmer-line"
          style={{
            top: "38%",
            height: 1,
            background: darkMode
              ? "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.2) 30%, rgba(59,130,246,0.2) 70%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(109,40,217,0.15) 30%, rgba(59,130,246,0.15) 70%, transparent 100%)",
          }}
        />
      </div>

      {/* === NAVBAR === */}
      <Navbar />

      {/* === THEME TOGGLE === */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="theme-toggle shimmer-line px-4 py-2 rounded-xl text-sm font-medium tracking-wide"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            background: darkMode
              ? "linear-gradient(135deg, rgba(124,58,237,0.85) 0%, rgba(79,70,229,0.85) 100%)"
              : "linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(79,70,229,0.9) 100%)",
            color: "#fff",
            border: darkMode
              ? "1px solid rgba(139,92,246,0.4)"
              : "1px solid rgba(109,40,217,0.3)",
            boxShadow: darkMode
              ? "0 0 20px rgba(124,58,237,0.35), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 0 20px rgba(109,40,217,0.2), 0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px)",
            letterSpacing: "0.02em",
          }}
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 pt-16 px-4">
        <AppRoutes />
      </div>
    </div>
  );
}