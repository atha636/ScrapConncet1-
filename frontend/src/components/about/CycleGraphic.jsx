import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import "../../styles/about.css";

// Hero graphic: the scrap loop. A dot orbits the ring while the three stops
// (you, the collector, recycling) breathe. One rotating group = one composited
// layer, so it stays smooth on phones.
const NODES = [
  { label: "You post", x: 160, y: 48, icon: <path d="M12 5v14M5 12h14" /> },
  { label: "Collector picks up", x: 257, y: 216, icon: <path d="M3 13h13l3 4M3 13V7h11v6M7 18a2 2 0 100-4 2 2 0 000 4zm9 0a2 2 0 100-4 2 2 0 000 4z" /> },
  { label: "Recycled", x: 63, y: 216, icon: <path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2M20 4v5h-5M4 20v-5h5" /> },
];

export default function CycleGraphic() {
  const ref = useRef(null);
  const inView = useInView(ref);

  return (
    <div ref={ref} className={`relative mx-auto w-full max-w-[300px] sm:max-w-[340px] ${inView ? "" : "about-paused"}`}>
      <div aria-hidden="true" className="absolute inset-6 rounded-full bg-rust/10 blur-3xl" />
      <svg viewBox="0 0 320 300" className="relative w-full h-auto" role="img" aria-label="Scrap goes from you to a collector to recycling, and the loop continues">
        <g className="about-orbit-reverse">
          <circle cx="160" cy="160" r="112" fill="none" className="text-line" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 9" strokeLinecap="round" />
        </g>
        <g className="about-orbit">
          <circle cx="160" cy="48" r="6" className="text-rust" fill="currentColor" />
          <circle cx="160" cy="48" r="12" className="text-rust" fill="currentColor" opacity="0.18" />
        </g>

        {/* centre logo */}
        <foreignObject x="118" y="118" width="84" height="84">
          <motion.img
            src="/logo-mark.png"
            alt=""
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-[84px] h-[84px] rounded-2xl shadow-[0_10px_24px_rgba(36,26,18,0.18)]"
          />
        </foreignObject>

        {NODES.map((n, i) => (
          <g key={n.label} transform={`translate(${n.x} ${n.y})`}>
            <g className="about-node" style={{ animationDelay: `${i * 0.8}s` }}>
              <circle r="22" className="text-surface" fill="currentColor" />
              <circle r="22" fill="none" className="text-rust" stroke="currentColor" strokeWidth="1.6" />
              <g transform="translate(-10 -10) scale(0.84)" className="text-rust" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {n.icon}
              </g>
            </g>
            <text y={i === 0 ? -32 : 40} textAnchor="middle" className="fill-ink" style={{ fontSize: 12, fontWeight: 600 }}>
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}