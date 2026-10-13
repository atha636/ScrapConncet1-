import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const ROUTE = "M28,168 C96,172 70,70 142,88 S238,150 292,42";
const TRIP_MS = 9000;
const HOLD_MS = 1600;

// Looping "collector on the way" demo. The truck is moved by writing SVG
// attributes straight from one requestAnimationFrame loop, so React never
// re-renders while it plays, and the loop only runs while the card is on
// screen — cheap enough for low-end phones.
export default function LiveTrackDemo() {
  const wrapRef = useRef(null);
  const pathRef = useRef(null);
  const trailRef = useRef(null);
  const truckRef = useRef(null);
  const etaRef = useRef(null);
  const barRef = useRef(null);
  const progressRef = useRef(0);
  const inView = useInView(wrapRef, { margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const path = pathRef.current;
    const trail = trailRef.current;
    const truck = truckRef.current;
    const etaEl = etaRef.current;
    const bar = barRef.current;
    if (!path || !trail || !truck || !etaEl || !bar) return;
    const len = path.getTotalLength();
    trail.style.strokeDasharray = `${len}`;
    let lastLabel = "";

    const place = (p) => {
      const pt = path.getPointAtLength(p * len);
      truck.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      trail.style.strokeDashoffset = `${(len * (1 - p)).toFixed(1)}`;
      bar.style.transform = `scaleX(${p.toFixed(3)})`;
      const mins = Math.ceil(((1 - p) * 25) / 5) * 5;
      const label = p >= 0.995 ? "Arrived" : `ETA ${mins} min`;
      if (label !== lastLabel) {
        etaEl.textContent = label;
        lastLabel = label;
      }
    };

    if (reduce) {
      place(0.62);
      return;
    }
    if (!inView) {
      place(progressRef.current);
      return;
    }

    let raf;
    let last = performance.now();
    let hold = 0;
    const tick = (now) => {
      const dt = Math.min(64, now - last); // clamp so a tab switch doesn't jump
      last = now;
      if (progressRef.current >= 1) {
        hold += dt;
        if (hold >= HOLD_MS) {
          hold = 0;
          progressRef.current = 0;
        }
      } else {
        progressRef.current = Math.min(1, progressRef.current + dt / TRIP_MS);
      }
      place(progressRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  return (
    <div ref={wrapRef} className="ticket p-4 sm:p-5 max-w-sm w-full mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono text-inkFaint tracking-wide">LIVE PICKUP</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rust">
          <span className="relative flex h-2 w-2">
            <span className="home-pulse-ring absolute inset-0 rounded-full bg-rust" />
            <span className="relative h-2 w-2 rounded-full bg-rust" />
          </span>
          On the way
        </span>
      </div>

      <div className="rounded-lg bg-bg border border-line overflow-hidden">
        <svg viewBox="0 0 320 200" className="w-full h-auto block" role="img" aria-label="A collector driving to the pickup location with a live arrival estimate">
          {/* faint street grid */}
          <g className="text-line" stroke="currentColor" strokeWidth="1" opacity="0.7">
            <path d="M0,50 H320 M0,110 H320 M0,170 H320 M60,0 V200 M130,0 V200 M200,0 V200 M270,0 V200" />
          </g>
          {/* full route (dashed) and travelled trail */}
          <path ref={pathRef} d={ROUTE} fill="none" className="text-inkFaint" stroke="currentColor" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" opacity="0.55" />
          <path d={ROUTE} ref={trailRef} fill="none" className="text-rust" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

          {/* destination pin */}
          <g transform="translate(292 42)" className="text-rust">
            <circle className="home-pulse-ring" r="9" fill="currentColor" />
            <path d="M0,-4 C-8,-4 -8,-16 0,-24 C8,-16 8,-4 0,-4Z" fill="currentColor" transform="translate(0 6)" />
            <circle r="2.6" cy="-14" fill="rgb(var(--c-surface))" transform="translate(0 6)" />
          </g>

          {/* truck */}
          <g ref={truckRef} transform="translate(28 168)">
            <circle r="13" className="text-rust" fill="currentColor" opacity="0.18" />
            <circle r="9" className="text-rust" fill="currentColor" />
            <path d="M-4,1 V-3 H1 V0 H4 V3 M-4,3 H4" fill="none" stroke="rgb(var(--c-surface))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>

      <div className="flex items-center justify-between mt-3 mb-2">
        <span ref={etaRef} className="font-display font-bold text-ink text-lg">ETA 25 min</span>
        <span className="text-[11px] text-inkFaint font-mono">Today · Afternoon 12–4</span>
      </div>
      <div className="h-1.5 rounded-full bg-line/60 overflow-hidden">
        <div ref={barRef} className="h-full w-full bg-rust origin-left" style={{ transform: "scaleX(0)" }} />
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-line">
        <div className="w-9 h-9 rounded-full bg-rust/10 text-rust font-display font-bold flex items-center justify-center">R</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">Ravi · Collector</p>
          <p className="text-[11px] text-inkSoft">ID verified · ★ 4.8</p>
        </div>
      </div>
    </div>
  );
}