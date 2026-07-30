import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Eases from 0 to `target` whenever `start` flips true. Respects
// prefers-reduced-motion by jumping straight to the end value instead of
// animating.
export default function useCountUp(target, start, duration = 700) {
  const [value, setValue] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!start) return;
    if (reduceMotion) {
      const raf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(raf);
    }
    let raf;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3)))); // ease-out cubic
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration, reduceMotion]);

  return value;
}