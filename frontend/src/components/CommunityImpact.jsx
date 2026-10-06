import { useEffect, useState } from "react";
import useCountUp from "../hooks/useCountUp";
import { getCommunityImpact } from "../services/impactService";

function Counter({ label, target, suffix = "" }) {
  const value = useCountUp(Math.round(target), true);
  return (
    <div className="text-center">
      <div className="font-display text-3xl sm:text-4xl font-bold text-rust">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs text-inkSoft mt-1">{label}</div>
    </div>
  );
}

// Public community totals for the Home page. Renders nothing until there's
// real data (and nothing at all if the request fails), so a brand-new
// install doesn't show a row of zeros.
export default function CommunityImpact() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getCommunityImpact()
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  if (!data || data.pickupCount === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-5 pb-16">
      <h2 className="font-display text-2xl font-bold text-ink text-center mb-2">Our community's impact</h2>
      <p className="text-sm text-inkSoft text-center mb-8">Together, from completed pickups on ScrapConnect.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <Counter label="Pickups completed" target={data.pickupCount} />
        <Counter label="Kg of scrap recycled" target={data.totalKg} />
        <Counter label="Kg CO₂ saved (est.)" target={data.co2Kg} />
        <Counter label="Verified collectors" target={data.collectorCount} />
      </div>
    </section>
  );
}