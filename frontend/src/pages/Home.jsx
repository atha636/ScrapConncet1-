import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import useDocumentMeta from "../hooks/useDocumentMeta";
import useCountUp from "../hooks/useCountUp";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";

// The hero's signature moment: instead of a generic decorative illustration,
// it's an actual receipt — reusing the same .ticket perforated-edge and
// .stamp ink-stamp classes every pickup card in the app already uses — that
// "prints" itself out on load, line by line, ending in a rubber-stamped
// PAID. It's the app's own visual language (thermal-receipt, not a stock
// "recycling" icon set), and it dramatizes the actual promise: post scrap,
// get paid on the spot.
const RECEIPT_ITEMS = [
  { label: "Metal · 10kg", amount: 500 },
  { label: "Plastic · 3kg", amount: 60 },
  { label: "E-waste · 1kg", amount: 40 },
];
const RECEIPT_TOTAL = RECEIPT_ITEMS.reduce((sum, item) => sum + item.amount, 0);

function ReceiptHero() {
  const [paperOut, setPaperOut] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const total = useCountUp(RECEIPT_TOTAL, showTotal);

  useEffect(() => {
    const t1 = setTimeout(() => setPaperOut(true), 200);
    const t2 = setTimeout(() => setShowTotal(true), 200 + 550 + RECEIPT_ITEMS.length * 180);
    const t3 = setTimeout(() => setShowStamp(true), 200 + 550 + RECEIPT_ITEMS.length * 180 + 750);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-[260px]">
        {/* Printer housing the paper feeds out of */}
        <div className="h-4 bg-ink rounded-t-md mx-2 shadow-[0_2px_0_rgba(36,26,18,0.15)]" />

        <motion.div
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={paperOut ? { clipPath: "inset(0 0 0% 0)" } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="ticket -rotate-2 px-5 pt-6 pb-5 font-mono"
        >
          <p className="text-center font-display font-bold text-sm text-ink tracking-tight mb-0.5">
            SCRAPCONNECT
          </p>
          <p className="text-center text-[10px] text-inkFaint mb-3">PICKUP RECEIPT</p>
          <div className="border-t border-dashed border-line mb-2.5" />

          {RECEIPT_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={paperOut ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.55 + i * 0.18 }}
              className="flex items-center justify-between text-[12px] text-inkSoft mb-1.5"
            >
              <span>{item.label}</span>
              <span className="text-ink">₹{item.amount}</span>
            </motion.div>
          ))}

          <div className="border-t border-dashed border-line my-2.5" />

          <div className="flex items-center justify-between text-xs font-semibold text-ink mb-4">
            <span>TOTAL</span>
            <span>₹{total}</span>
          </div>

          <div className="flex justify-center h-8">
            {showStamp && (
              <motion.span
                initial={{ opacity: 0, scale: 1.6, rotate: -18 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                transition={{ duration: 0.35, ease: "backOut" }}
                className="stamp stamp-completed"
              >
                Paid ✓
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Torn edge at the bottom of the receipt */}
        <svg viewBox="0 0 260 12" className="w-full -mt-px" preserveAspectRatio="none">
          <path
            d="M0,0 L10,10 L20,0 L30,10 L40,0 L50,10 L60,0 L70,10 L80,0 L90,10 L100,0 L110,10 L120,0 L130,10 L140,0 L150,10 L160,0 L170,10 L180,0 L190,10 L200,0 L210,10 L220,0 L230,10 L240,0 L250,10 L260,0 L260,0 L0,0 Z"
            fill="#FAF5EA"
            stroke="#D8C9AE"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

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
  { title: "No listing fees", text: "Post as many pickups you want, completely free." },
  { title: "Live tracking", text: "Watch your request move from pending to completed in real time,with live chat." },
  { title: "Built-in chat", text: "Coordinate timing and exact location directly with your collector." },
  { title: "Rated collectors", text: "See ratings from other requesters before you accept an offer, and give them rating also." },
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

          <ReceiptHero />
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