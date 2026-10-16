import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig, useReducedMotion, useScroll } from "framer-motion";
import CycleGraphic from "../components/about/CycleGraphic";
import MoneyFlow from "../components/about/MoneyFlow";
import "../styles/home.css";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";

const VALUES = [
  {
    title: "No middlemen",
    text: "The price you see is settled directly between you and the collector. Requesters never pay a platform fee; collectors may pay a small commission or choose a plan.",
    icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  },
  {
    title: "Built for both sides",
    text: "A requester posting scrap and a collector picking it up both get the same live tracking, chat, and ratings.",
    icon: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><path d="M10.5 9.5l3 5" /></>,
  },
  {
    title: "Trust through ratings",
    text: "Every completed pickup can be rated by both sides, so reputation is earned pickup by pickup, not bought.",
    icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  },
  {
    title: "Simple, not clever",
    text: "Post what you've got, get picked up, get paid. No listings to manage, no bidding wars, no waiting around.",
    icon: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12l2 2 4-4" /></>,
  },
];

// Honest product characteristics, not fabricated growth metrics — nothing
// here claims a user/order count we don't actually have.
const HIGHLIGHTS = [
  { value: "₹0", label: "Platform fee for requesters" },
  { value: "1:1", label: "Direct chat with your collector" },
  { value: "2-way", label: "Ratings, both sides" },
  { value: "Free", label: "To post, for requesters" },
];

const JOURNEY = [
  {
    title: "The problem",
    text: "Scrap sitting around a home or shop is money left untouched — and finding a collector who'll actually show up used to mean word of mouth and phone tag.",
  },
  {
    title: "What we built",
    text: "A place to post what you've got, let nearby collectors claim it, and settle payment in person the moment it's weighed — with live status and chat the whole way.",
  },
  {
    title: "Where we're headed",
    text: "More materials, more cities, and the same principle we started with: keep it direct, keep it simple, take nothing off the top.",
  },
];

const SAFETY = [
  {
    title: "ID-verified collectors",
    text: "Collectors submit an ID for review before they can take pickups, and you can see their ratings first.",
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M14 10h4M14 14h4M6 16c.6-1.6 2-2.4 3-2.4s2.4.8 3 2.4" /></>,
  },
  {
    title: "Share your trip",
    text: "Send a private link so family can follow the pickup live — first name and status only, no phone numbers.",
    icon: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4" /></>,
  },
  {
    title: "SOS in one hold",
    text: "Press and hold during a pickup to alert our safety team with your location. The other person isn't told.",
    icon: <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" />,
  },
];

const MATERIALS_LINE = ["Metal", "Plastic", "Paper", "E-waste", "Glass", "and more"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function MaterialsMarquee() {
  const row = MATERIALS_LINE.concat(MATERIALS_LINE, MATERIALS_LINE);
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

// One continuous line that fills as the reader scrolls through the story
// (a single transform, no per-frame React work).
function Timeline() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });

  return (
    <div ref={ref} className="relative">
      <div aria-hidden="true" className="absolute left-[17px] sm:left-[19px] top-4 bottom-4 w-px bg-line" />
      <motion.div
        aria-hidden="true"
        style={{ scaleY: reduce ? 1 : scrollYProgress, transformOrigin: "top" }}
        className="absolute left-[16px] sm:left-[18px] top-4 bottom-4 w-0.5 bg-rust"
      />
      {JOURNEY.map((step, i) => (
        <motion.div
          key={step.title}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="relative flex gap-5 sm:gap-6"
        >
          <motion.div
            initial={{ scale: 0.6 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.35, ease: "backOut" }}
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-rust text-surface font-display font-bold text-sm flex items-center justify-center z-10"
          >
            {i + 1}
          </motion.div>
          <div className="pb-9 sm:pb-11 min-w-0">
            <h3 className="font-display font-semibold text-ink text-base sm:text-lg mb-1.5">{step.title}</h3>
            <p className="text-sm text-inkSoft leading-relaxed max-w-md">{step.text}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function AboutUs() {
  const { user } = useAuth();

  useDocumentMeta({
    title: "About Us",
    description:
      "ScrapConnect connects people with scrap to nearby collectors — free for requesters, no middlemen, paid on the spot.",
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-12 sm:pt-16 pb-12 sm:pb-16 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="text-center md:text-left">
            <motion.p variants={fadeUp} className="text-xs font-mono tracking-widest text-rust mb-3">ABOUT SCRAPCONNECT</motion.p>
            <motion.h1
              variants={fadeUp}
              className="font-display text-3xl sm:text-5xl font-bold text-ink leading-tight mb-5"
            >
              Scrap shouldn't<br />sit around.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-inkSoft text-sm sm:text-base leading-relaxed max-w-md mx-auto md:mx-0">
              We built ScrapConnect to make selling scrap as easy as it should always have been —
              post what you've got, a collector nearby picks it up, and you get paid on the spot.
              Free for requesters, with a time slot you choose, live tracking and no middlemen.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center md:justify-start mt-8">
              {user ? (
                <Link to={roleHome(user.role)} className="btn-primary">Go to Dashboard</Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary">Get started free</Link>
                  <Link to="/" className="btn-secondary">See how it works</Link>
                </>
              )}
            </motion.div>
          </motion.div>

          <CycleGraphic />
        </section>

        <MaterialsMarquee />

        {/* Highlights strip */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="bg-surface border-y border-line py-8 sm:py-10"
        >
          <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {HIGHLIGHTS.map((h) => (
              <motion.div key={h.label} variants={fadeUp} className="text-center">
                <div className="font-display font-bold text-2xl sm:text-3xl text-rust mb-1">{h.value}</div>
                <div className="text-[11px] sm:text-xs text-inkFaint leading-snug">{h.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Mission */}
        <section className="py-14 sm:py-16">
          <div className="max-w-3xl mx-auto px-5">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              className="ticket p-6 sm:p-9 text-center relative overflow-hidden"
            >
              <div
                className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-amber/10"
                aria-hidden="true"
              />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink mb-3 relative">Our mission</h2>
              <p className="text-sm text-inkSoft leading-relaxed relative">
                Scrap that's just sitting around is money left on the table and a missed chance
                to keep it out of landfill. We connect people who have scrap with collectors who
                want it, cutting out the friction on both sides — so recycling something is as
                simple as requesting a ride.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Journey timeline */}
        <section className="bg-surface border-y border-line py-14 sm:py-16">
          <div className="max-w-2xl mx-auto px-5">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              className="font-display text-xl sm:text-2xl font-bold text-ink text-center mb-10 sm:mb-12"
            >
              Our story, in three parts
            </motion.h2>
            <Timeline />
          </div>
        </section>

        {/* Where the money goes */}
        <section className="max-w-4xl mx-auto px-5 py-14 sm:py-16 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="text-center md:text-left"
          >
            <motion.p variants={fadeUp} className="text-xs font-mono tracking-widest text-rust mb-2">HOW THE MONEY WORKS</motion.p>
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-2xl font-bold text-ink mb-3">
              Your payout stays yours
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm text-inkSoft leading-relaxed">
              The collector pays you directly the moment your scrap is weighed. We keep the platform running with a
              small commission or a plan fee from collectors — never from requesters.
            </motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <MoneyFlow />
          </motion.div>
        </section>

        {/* Trust & safety */}
        <section className="bg-surface border-y border-line py-14 sm:py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto px-5"
          >
            <motion.p variants={fadeUp} className="text-center text-xs font-mono tracking-widest text-rust mb-2">TRUST &amp; SAFETY</motion.p>
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-2xl font-bold text-ink text-center mb-10 sm:mb-12">
              Built so you feel safe letting someone in
            </motion.h2>
            <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
              {SAFETY.map((f) => (
                <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -4 }} className="ticket p-5 sm:p-6">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                    whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                    className="w-11 h-11 rounded-full bg-rust/10 text-rust flex items-center justify-center mb-3.5"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {f.icon}
                    </svg>
                  </motion.div>
                  <h3 className="font-display font-semibold text-ink mb-1.5 text-[15px] sm:text-base">{f.title}</h3>
                  <p className="text-sm text-inkSoft leading-relaxed">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Values */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-5 py-14 sm:py-16"
        >
          <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-2xl font-bold text-ink text-center mb-10 sm:mb-12">
            What we stand for
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {VALUES.map((v) => (
              <motion.div
                key={v.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="ticket p-5 sm:p-6"
              >
                <div className="w-10 h-10 rounded-full bg-rust/10 text-rust flex items-center justify-center mb-3.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {v.icon}
                  </svg>
                </div>
                <h3 className="font-display font-semibold text-ink mb-1.5 text-[15px] sm:text-base">{v.title}</h3>
                <p className="text-sm text-inkSoft leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        {!user ? (
          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="bg-rust py-14 sm:py-16"
          >
            <div className="max-w-2xl mx-auto px-5 text-center">
              <h2 className="font-display text-xl sm:text-3xl font-bold text-surface mb-4">
                Ready to clear out your scrap?
              </h2>
              <p className="text-surface/80 text-sm sm:text-base mb-8">Free for requesters — sign up in under a minute.</p>
              <Link to="/register" className="inline-flex btn-primary !bg-surface !text-rust hover:!bg-surfaceRaised">
                Create your account
              </Link>
            </div>
          </motion.section>
        ) : (
          <div className="max-w-2xl mx-auto px-5 py-12 text-center">
            <Link to={roleHome(user.role)} className="btn-primary">Go to Dashboard</Link>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}