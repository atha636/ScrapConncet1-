import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PLANS = [
  { name: "Free", price: "₹0", cut: "10%", note: "Start earning right away", featured: false },
  { name: "Pro", price: "₹499", per: "/ 30 days", cut: "6%", note: "For regular collectors", featured: true },
  { name: "Elite", price: "₹999", per: "/ 30 days", cut: "3%", note: "Keep the most of every pickup", featured: false },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function PlansShowcase({ user }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      className="max-w-6xl mx-auto px-5 py-16"
    >
      <motion.p variants={fadeUp} className="text-center text-xs font-mono tracking-widest text-rust mb-2">FOR COLLECTORS</motion.p>
      <motion.h2 variants={fadeUp} className="font-display text-2xl font-bold text-ink text-center mb-3">
        Grow your scrap business
      </motion.h2>
      <motion.p variants={fadeUp} className="text-sm text-inkSoft text-center mb-10 max-w-lg mx-auto">
        Claim nearby requests, run a team, and get paid into your in-app wallet. Pick a plan to lower the
        platform commission on each pickup.
      </motion.p>

      <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
        {PLANS.map((p) => (
          <motion.div
            key={p.name}
            variants={fadeUp}
            whileHover={{ y: -4 }}
            className={`ticket p-5 text-center relative ${p.featured ? "ring-2 ring-rust" : ""}`}
          >
            {p.featured && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-rust text-surface px-2.5 py-0.5 rounded-full">
                POPULAR
              </span>
            )}
            <h3 className="font-display font-semibold text-ink">{p.name}</h3>
            <p className="font-display text-3xl font-bold text-ink mt-2">
              {p.price}
              {p.per && <span className="text-xs font-normal text-inkFaint"> {p.per}</span>}
            </p>
            <p className="mt-3 text-sm text-inkSoft">
              <span className="font-semibold text-rust">{p.cut}</span> commission
            </p>
            <p className="mt-1 text-xs text-inkFaint">{p.note}</p>
          </motion.div>
        ))}
      </div>

      <motion.p variants={fadeUp} className="text-[11px] text-inkFaint text-center mt-5">
        Default plans shown. Commission and plan prices are set by the platform and can change.
      </motion.p>

      {!user && (
        <motion.div variants={fadeUp} className="text-center mt-6">
          <Link to="/register?role=collector" className="btn-secondary">Become a collector</Link>
        </motion.div>
      )}
    </motion.section>
  );
}