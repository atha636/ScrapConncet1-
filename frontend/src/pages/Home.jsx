import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";

const STEPS = [
  {
    title: "Post your scrap",
    text: "Tell us what you've got — metal, e-waste, plastic, paper, glass — and share your pickup location.",
  },
  {
    title: "A collector accepts",
    text: "Nearby collectors see your request live and claim it. You'll get notified the moment someone does.",
  },
  {
    title: "Get paid on the spot",
    text: "They show up, weigh it, and pay you directly. Mark it complete and you're done.",
  },
];

const FEATURES = [
  { title: "No listing fees", text: "Post as many pickups as you want, completely free." },
  { title: "Live tracking", text: "Watch your request move from pending to completed in real time." },
  { title: "Built-in chat", text: "Coordinate timing and exact location directly with your collector." },
  { title: "Rated collectors", text: "See ratings from other requesters before you accept an offer." },
];

const MATERIALS = [
  {
    label: "Metal",
    icon: <path d="M4 4h16v6H4zM4 14h10v6H4zM17 14h3v6h-3z" />,
  },
  {
    label: "Plastic",
    icon: <path d="M12 2l3 5H9l3-5zM5 9h14l-1.5 11a2 2 0 01-2 1.8H8.5a2 2 0 01-2-1.8L5 9z" />,
  },
  {
    label: "Paper",
    icon: <path d="M6 2h9l5 5v15H6V2zM15 2v5h5" />,
  },
  {
    label: "E-waste",
    icon: <><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 20h8M12 16v4" /></>,
  },
  {
    label: "Glass",
    icon: <path d="M9 2h6l1 6-1 6a4 4 0 01-6 0l-1-6 1-6z" />,
  },
  {
    label: "Other",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
  },
];

const FAQS = [
  {
    q: "Is ScrapConnect really free to use?",
    a: "Yes — posting a pickup request costs nothing, and there's no commission taken from either side. The price shown is an estimate based on scrap type and weight; the exact amount is settled directly between you and the collector when they weigh it.",
  },
  {
    q: "How is the price estimated?",
    a: "It's calculated from your scrap type and estimated weight using standard per-kg rates. It's a starting estimate to help both sides — the final amount is agreed in person once the scrap is actually weighed.",
  },
  {
    q: "Can I cancel a pickup request?",
    a: "Yes, any time before a collector marks it as picked up. Once they're en route, cancelling in-app is disabled — at that point it's best to coordinate a change directly through the built-in chat.",
  },
  {
    q: "How do I know a collector is trustworthy?",
    a: "Every completed pickup can be rated by both sides, so you can check a collector's rating before accepting an offer from them, and vice versa.",
  },
  {
    q: "What if no collector accepts my request?",
    a: "Your request stays visible to nearby collectors until one accepts or you cancel it — there's no time limit or expiry forcing your hand either way.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div variants={fadeUp} className="ticket overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-display font-semibold text-ink text-sm">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-rust shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-4 text-sm text-inkSoft leading-relaxed">{a}</p>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useDocumentMeta({
    title: "Sell Your Scrap, Get Picked Up Fast",
    description:
      "ScrapConnect connects people with scrap metal, plastic, paper, and e-waste to nearby collectors. Request a pickup in minutes and get paid.",
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        {/* Nav */}
        <nav
          className={`sticky top-0 z-40 bg-surface border-b transition-shadow ${
            scrolled ? "border-line shadow-[0_2px_12px_rgba(36,26,18,0.06)]" : "border-transparent"
          }`}
        >
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-rust flex items-center justify-center rotate-[-3deg]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2.3">
                  <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <span className="font-display font-bold text-lg text-ink tracking-tight">ScrapConnect</span>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <Link to={roleHome(user.role)} className="btn-primary !py-2 !px-4 text-sm">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary !py-2 !px-4 text-sm">Sign in</Link>
                  <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">Get started</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight mb-5"
            >
              Turn your scrap<br />into cash, today.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-inkSoft text-base leading-relaxed mb-8 max-w-md">
              Post what you've got and a collector nearby picks it up, weighs it, and pays you
              on the spot. No fees, no middlemen, no listing hassle.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              {user ? (
                <Link to={roleHome(user.role)} className="btn-primary">Go to Dashboard</Link>
              ) : (
                <>
                  <Link to="/register?role=user" className="btn-primary">Request a pickup</Link>
                  <Link to="/register?role=collector" className="btn-secondary">Become a collector</Link>
                </>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="flex items-center justify-center"
          >
            <svg width="320" height="260" viewBox="0 0 320 260" fill="none">
              <circle cx="160" cy="130" r="120" fill="#A63D24" fillOpacity="0.06" />
              <line x1="30" y1="220" x2="290" y2="220" stroke="#D8C9AE" strokeWidth="2" />

              {/* Weighing scale */}
              <g transform="translate(50, 130)">
                <rect x="0" y="60" width="14" height="20" rx="2" fill="#A63D24" />
                <rect x="-10" y="78" width="34" height="6" rx="2" fill="#A63D24" />
                <line x1="7" y1="60" x2="7" y2="10" stroke="#A63D24" strokeWidth="3" />
                <line x1="-25" y1="10" x2="39" y2="10" stroke="#A63D24" strokeWidth="3" />
                <circle cx="-25" cy="30" r="16" fill="none" stroke="#A63D24" strokeWidth="3" />
                <circle cx="39" cy="22" r="16" fill="none" stroke="#A63D24" strokeWidth="3" />
                <path d="M-25 10 L-25 22" stroke="#A63D24" strokeWidth="2" />
                <path d="M39 10 L39 22" stroke="#A63D24" strokeWidth="2" />
              </g>

              {/* Recycling arrows */}
              <g transform="translate(170, 60)">
                <path d="M20 0 A20 20 0 0 1 38 15 L32 13 M38 15 L34 22" stroke="#C4841E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 40 A20 20 0 0 1 2 25 L8 27 M2 25 L6 18" stroke="#C4841E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0 20 A20 20 0 0 1 15 1 L14 8 M15 1 L22 4" stroke="#C4841E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Truck */}
              <g transform="translate(190, 150)">
                <rect x="0" y="0" width="55" height="30" rx="3" fill="#241A12" />
                <path d="M55 10 h18 l12 12 v8 h-30 z" fill="#241A12" fillOpacity="0.75" />
                <circle cx="16" cy="34" r="8" fill="#A63D24" stroke="#FAF5EA" strokeWidth="2.5" />
                <circle cx="70" cy="34" r="8" fill="#A63D24" stroke="#FAF5EA" strokeWidth="2.5" />
              </g>
            </svg>
          </motion.div>
        </section>

        {/* Supported materials */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-5 pb-16"
        >
          <motion.h2 variants={fadeUp} className="font-display text-2xl font-bold text-ink text-center mb-3">
            What can you post?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-sm text-inkSoft text-center mb-10 max-w-md mx-auto">
            Any of these — mix and match across multiple requests, there's no limit.
          </motion.p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {MATERIALS.map((m) => (
              <motion.div
                key={m.label}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                className="ticket p-4 flex flex-col items-center gap-2.5 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-rust/10 text-rust flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {m.icon}
                  </svg>
                </div>
                <span className="text-xs font-semibold text-ink">{m.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it works */}
        <section className="bg-surface border-y border-line py-16">
          <div className="max-w-6xl mx-auto px-5">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              className="font-display text-2xl font-bold text-ink text-center mb-12"
            >
              How it works
            </motion.h2>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="grid sm:grid-cols-3 gap-8"
            >
              {STEPS.map((s, i) => (
                <motion.div key={s.title} variants={fadeUp} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-rust text-surface font-display font-bold flex items-center justify-center mx-auto mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-display font-semibold text-ink mb-2">{s.title}</h3>
                  <p className="text-sm text-inkSoft leading-relaxed">{s.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-5 py-16"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -3 }} className="ticket p-5">
                <h3 className="font-display font-semibold text-ink mb-1.5">{f.title}</h3>
                <p className="text-sm text-inkSoft leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <section className="bg-surface border-y border-line py-16">
          <div className="max-w-2xl mx-auto px-5">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              className="font-display text-2xl font-bold text-ink text-center mb-10"
            >
              Common questions
            </motion.h2>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="space-y-3"
            >
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA — only relevant to visitors who don't have an account yet */}
        {!user && (
          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="bg-rust py-16"
          >
            <div className="max-w-2xl mx-auto px-5 text-center">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-surface mb-4">
                Ready to clear out your scrap?
              </h2>
              <p className="text-surface/80 mb-8">Join free — takes less than a minute.</p>
              <Link to="/register" className="inline-flex btn-primary !bg-surface !text-rust hover:!bg-surfaceRaised">
                Create your account
              </Link>
            </div>
          </motion.section>
        )}

        {/* Footer */}
        <footer className="border-t border-line py-8">
          <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-inkFaint">
            <span>© {new Date().getFullYear()} ScrapConnect</span>
            <div className="flex gap-5">
              {user ? (
                <Link to={roleHome(user.role)} className="hover:text-rust">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="hover:text-rust">Sign in</Link>
                  <Link to="/register" className="hover:text-rust">Sign up</Link>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}