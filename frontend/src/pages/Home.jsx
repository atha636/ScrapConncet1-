import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig, useInView } from "framer-motion";
import useDocumentMeta from "../hooks/useDocumentMeta";
import useCountUp from "../hooks/useCountUp";
import CommunityImpact from "../components/CommunityImpact";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";
import LanguageToggle from "../components/common/LanguageToggle";
import LiveTrackDemo from "../components/home/LiveTrackDemo";
import PlansShowcase from "../components/home/PlansShowcase";
import "../styles/home.css";


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

const TRUST_ITEMS = [
  "ID-verified collectors",
  "Pick your time slot",
  "Live ETA tracking",
  "Digital receipts",
  "Promo codes",
  "Eco impact certificate",
  "Free for requesters",
];

function TrustMarquee() {
  // Two identical halves so the -50% translate loops seamlessly.
  const row = TRUST_ITEMS.concat(TRUST_ITEMS);
  return (
    <div className="border-y border-line bg-surface overflow-hidden py-3" aria-hidden="true">
      <div className="home-marquee-track">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {row.map((t, i) => (
              <span key={`${k}-${i}`} className="flex items-center text-xs font-semibold text-inkSoft whitespace-nowrap">
                <span className="mx-5 text-rust">✦</span>
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const SPOTLIGHT = [
  { title: "Choose your window", text: "Morning, afternoon or evening — the collector arrives when it suits you, not the other way round." },
  { title: "Watch them arrive", text: "A live map and a running ETA, updated as they drive. No more waiting by the door." },
  { title: "Never miss a pickup", text: "A reminder before your window starts and an alert when your collector is almost there." },
];

const STEPS = [
  {
    title: "Post your scrap",
    text: "Tell us what you've got — metal, e-waste, plastic, paper, glass — and share your pickup location.",
  },
  {
    title: "A collector accepts",
    text: "Pick a time window that suits you. Nearby verified collectors see your request live and claim it, and you're notified the moment someone does.",
  },
  {
    title: "Track, hand over, get paid",
    text: "Follow your collector's live ETA. They weigh it and pay you directly, then you get a digital receipt.",
  },
];

const FEATURES = [
  { title: "Free for requesters", text: "Posting pickups costs you nothing — no listing fees and no platform charge on your payout." },
  { title: "Pick your time slot", text: "Choose a morning, afternoon or evening window, and get a reminder before your collector arrives." },
  { title: "Live tracking & ETA", text: "See your collector on the way with a live arrival estimate, and get alerted when they're close." },
  { title: "Built-in chat", text: "Coordinate timing and exact location directly with your collector." },
  { title: "ID-verified collectors", text: "Collectors submit ID for review, and you can check ratings from other requesters before you accept." },
  { title: "Promo codes", text: "Apply a promo code when you post a pickup to earn a bonus on top of your scrap value." },
  { title: "Receipts & eco impact", text: "Every completed pickup gets a digital receipt, plus a record of the recycling impact you made." },
  { title: "Help centre", text: "Raise a support ticket any time and follow the replies right inside the app." },
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
    a: "For requesters, yes — posting a pickup costs nothing and we take no fee from what the collector pays you. Collectors may pay a small platform commission on completed pickups, which they can lower by choosing a Pro or Elite plan. The price shown is an estimate; the exact amount is settled when the scrap is weighed.",
  },
  {
    q: "Can I choose when the collector comes?",
    a: "Yes. When you post a request you can pick a date and a time window — morning, afternoon or evening. You'll get a reminder before the window starts, and you'll be told if it's missed.",
  },
  {
    q: "Can I track my collector?",
    a: "Once your collector is on the way you can follow their live location and a running ETA, and you'll get a notification when they're about to arrive.",
  },
  {
    q: "How do collectors earn, and what are the plans?",
    a: "Collectors keep the price paid for each pickup minus a platform commission that depends on their plan: Free, Pro or Elite. Higher plans mean a lower commission. Plans are paid from the collector's in-app wallet, and the commission rate is set by the platform admin.",
  },
  {
    q: "Can I use a promo code?",
    a: "Yes. Enter a valid promo code when you request a pickup and the bonus is added to your payout once the pickup is completed.",
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
    a: "Collectors submit ID for verification, and every completed pickup can be rated by both sides, so you can check a collector's rating before accepting an offer from them, and vice versa.",
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
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef);
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
              <img src="/logo-mark.png" alt="" className="w-8 h-8 rounded-md rotate-[-3deg]" />
              <span className="font-display font-bold text-base sm:text-lg text-ink tracking-tight">ScrapConnect</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
              <LanguageToggle />
              {user ? (
                <Link to={roleHome(user.role)} className="btn-primary !py-2 !px-4 text-sm">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <span className="hidden sm:block">
                    <Link to="/login" className="btn-secondary !py-2 !px-4 text-sm">Sign in</Link>
                  </span>
                  <Link to="/register" className="btn-primary !py-2 !px-3 sm:!px-4 text-sm">Get started</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section
          ref={heroRef}
          className={`relative max-w-6xl mx-auto px-5 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center ${heroInView ? "" : "home-paused"}`}
        >
          <div aria-hidden="true" className="home-glow pointer-events-none absolute right-4 top-10 w-72 h-72 rounded-full bg-rust/10 blur-3xl" />
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight mb-5"
            >
              Turn your scrap<br />into cash, today.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-inkSoft text-base leading-relaxed mb-8 max-w-md">
              Post what you've got and a collector nearby picks it up, weighs it, and pays you
              on the spot. Free for you to post, with a time slot you choose and live tracking
              all the way to your door.
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

          <div className="relative">
            <ReceiptHero />
            <span aria-hidden="true" className="home-float-a absolute -left-1 sm:-left-6 top-2 w-11 h-11 rounded-full bg-surface border border-line shadow-md flex items-center justify-center text-rust">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v6H4zM4 14h10v6H4zM17 14h3v6h-3z" /></svg>
            </span>
            <span aria-hidden="true" className="home-float-b absolute -right-1 sm:-right-6 top-24 w-11 h-11 rounded-full bg-surface border border-line shadow-md flex items-center justify-center text-amber-dark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 20h8M12 16v4" /></svg>
            </span>
            <span aria-hidden="true" className="home-float-a absolute left-2 sm:-left-2 bottom-6 w-10 h-10 rounded-full bg-surface border border-line shadow-md flex items-center justify-center text-rust">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3 5H9l3-5zM5 9h14l-1.5 11a2 2 0 01-2 1.8H8.5a2 2 0 01-2-1.8L5 9z" /></svg>
            </span>
          </div>
        </section>

        <TrustMarquee />

        <CommunityImpact />

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
              className="relative grid sm:grid-cols-3 gap-8"
            >
              <motion.div
                aria-hidden="true"
                variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 1, ease: "easeOut" } } }}
                className="hidden sm:block absolute top-5 left-[16%] right-[16%] h-0.5 bg-rust/30 origin-left"
              />
              {STEPS.map((s, i) => (
                <motion.div key={s.title} variants={fadeUp} className="text-center">
                  <div className="relative w-10 h-10 rounded-full bg-rust text-surface font-display font-bold flex items-center justify-center mx-auto mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-display font-semibold text-ink mb-2">{s.title}</h3>
                  <p className="text-sm text-inkSoft leading-relaxed">{s.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Spotlight: slots + live tracking */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
            >
              <motion.p variants={fadeUp} className="text-xs font-mono tracking-widest text-rust mb-2">OUR BEST FEATURE</motion.p>
              <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight mb-4">
                Know exactly when your collector arrives
              </motion.h2>
              <motion.p variants={fadeUp} className="text-inkSoft text-sm leading-relaxed mb-6 max-w-md">
                Scrap pickups used to mean a vague "sometime today". With time slots and live tracking, you
                set the window and follow the collector all the way to your door.
              </motion.p>
              <div className="space-y-4">
                {SPOTLIGHT.map((f, i) => (
                  <motion.div key={f.title} variants={fadeUp} className="flex gap-3">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-rust/10 text-rust text-xs font-bold flex items-center justify-center">{i + 1}</div>
                    <div>
                      <h3 className="font-display font-semibold text-ink text-sm">{f.title}</h3>
                      <p className="text-sm text-inkSoft leading-relaxed">{f.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <LiveTrackDemo />
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

        <PlansShowcase user={user} />

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
              <p className="text-surface/80 mb-8">Free for requesters — sign up in under a minute.</p>
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
              <Link to="/about" className="hover:text-rust">About us</Link>
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