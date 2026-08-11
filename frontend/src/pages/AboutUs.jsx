import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";

const VALUES = [
  {
    title: "No middlemen",
    text: "The price you see is settled directly between you and the collector — we never take a cut.",
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
  { value: "0%", label: "Commission taken" },
  { value: "1:1", label: "Direct chat with your collector" },
  { value: "2-way", label: "Ratings, both sides" },
  { value: "Free", label: "To post, always" },
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function AboutHero() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center">
      {/* Soft radial glow behind the logo — echoes the receipt hero's
          "spotlight" without competing with it on a different page */}
      <div
        className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-rust/10 blur-3xl"
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: -3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={reduceMotion ? undefined : { rotate: 0, scale: 1.04 }}
        className="relative"
      >
        <img
          src="/logo-mark.png"
          alt="ScrapConnect"
          className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shadow-[0_12px_32px_rgba(36,26,18,0.18)]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4, ease: "backOut" }}
          className="stamp stamp-completed absolute -bottom-3 -right-4 rotate-[8deg] scale-[0.6] sm:scale-75 origin-bottom-right"
        >
          Est. today
        </motion.div>
      </motion.div>
    </div>
  );
}

function JourneyStep({ step, index, isLast }) {
  const [inView, setInView] = useState(false);

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      onViewportEnter={() => setInView(true)}
      variants={fadeUp}
      className="relative flex gap-5 sm:gap-6"
    >
      <div className="flex flex-col items-center shrink-0">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.35, ease: "backOut" }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rust text-surface font-display font-bold text-sm flex items-center justify-center z-10"
        >
          {index + 1}
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top" }}
            className="w-px flex-1 bg-line min-h-[2.25rem] mt-1"
          />
        )}
      </div>
      <div className="pb-8 sm:pb-10 min-w-0">
        <h3 className="font-display font-semibold text-ink text-base sm:text-lg mb-1.5">{step.title}</h3>
        <p className="text-sm text-inkSoft leading-relaxed max-w-md">{step.text}</p>
      </div>
    </motion.div>
  );
}

export default function AboutUs() {
  const { user } = useAuth();

  useDocumentMeta({
    title: "About Us",
    description:
      "ScrapConnect connects people with scrap to nearby collectors — no fees, no middlemen, paid on the spot.",
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 pt-14 sm:pt-20 pb-14 sm:pb-16 text-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.div variants={fadeUp} className="mb-8 sm:mb-10">
              <AboutHero />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-3xl sm:text-5xl font-bold text-ink leading-tight mb-5 px-2"
            >
              About ScrapConnect
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-inkSoft text-sm sm:text-base leading-relaxed max-w-xl mx-auto px-2"
            >
              We built ScrapConnect to make selling scrap as easy as it should always have been —
              post what you've got, a collector nearby picks it up, and you get paid on the spot.
              No fees, no listing hassle, no middlemen taking a cut.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center mt-8">
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
        </section>

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
            <div>
              {JOURNEY.map((step, i) => (
                <JourneyStep key={step.title} step={step} index={i} isLast={i === JOURNEY.length - 1} />
              ))}
            </div>
          </div>
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
              <p className="text-surface/80 text-sm sm:text-base mb-8">Join free — takes less than a minute.</p>
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