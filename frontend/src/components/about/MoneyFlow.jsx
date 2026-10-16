import { useRef } from "react";
import { useInView } from "framer-motion";
import "../../styles/about.css";

// Shows where the money goes: the collector pays the requester directly, and
// only collectors may pay the platform a small commission (or a plan fee).
export default function MoneyFlow() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "0px 0px -15% 0px" });

  return (
    <div ref={ref} className={`ticket p-4 sm:p-6 ${inView ? "" : "about-paused"}`}>
      <svg viewBox="0 0 320 226" className="w-full h-auto" role="img" aria-label="The collector pays the requester directly. Collectors may pay the platform a small commission.">
        {/* paths */}
        <line x1="80" y1="74" x2="240" y2="74" className="text-rust" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" opacity="0.5" />
        <line x1="252" y1="98" x2="178" y2="146" className="text-inkFaint" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" opacity="0.6" />

        {/* coins → requester */}
        {["about-coin-a", "about-coin-b", "about-coin-c"].map((c) => (
          <g key={c} className={c}>
            <circle cx="232" cy="74" r="7" className="text-amber" fill="currentColor" />
            <text x="232" y="77.5" textAnchor="middle" className="fill-surface" style={{ fontSize: 9, fontWeight: 700 }}>₹</text>
          </g>
        ))}
        {/* small commission coin → platform */}
        <g className="about-coin-fee">
          <circle cx="248" cy="100" r="4.5" className="text-inkFaint" fill="currentColor" />
        </g>

        {/* nodes */}
        {[
          { x: 52, y: 74, t: "Requester", s: "Gets paid in full" },
          { x: 268, y: 74, t: "Collector", s: "Pays on the spot" },
          { x: 160, y: 162, t: "ScrapConnect", s: "Collectors only" },
        ].map((n) => (
          <g key={n.t} transform={`translate(${n.x} ${n.y})`}>
            <circle r="26" className="text-surface" fill="currentColor" />
            <circle r="26" fill="none" className={n.t === "ScrapConnect" ? "text-inkFaint" : "text-rust"} stroke="currentColor" strokeWidth="1.6" />
            <text y="4" textAnchor="middle" className="fill-ink" style={{ fontSize: 11, fontWeight: 700 }}>
              {n.t === "Requester" ? "YOU" : n.t === "Collector" ? "PICK" : "SC"}
            </text>
            <text y={n.t === "ScrapConnect" ? 46 : -46} textAnchor="middle" className="fill-ink" style={{ fontSize: 12, fontWeight: 700 }}>{n.t}</text>
            <text y={n.t === "ScrapConnect" ? 59 : -33} textAnchor="middle" className="fill-inkFaint" style={{ fontSize: 10.5 }}>{n.s}</text>
          </g>
        ))}
      </svg>
      <p className="text-xs text-inkSoft leading-relaxed mt-2 text-center max-w-sm mx-auto">
        The collector pays you directly the moment it's weighed. Requesters pay no platform fee — collectors may pay a
        small commission or choose a plan.
      </p>
    </div>
  );
}