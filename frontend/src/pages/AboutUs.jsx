import { Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";

const VALUES = [
  {
    title: "No middlemen",
    text: "The price you see is settled directly between you and the collector — we never take a cut.",
  },
  {
    title: "Built for both sides",
    text: "A requester posting scrap and a collector picking it up both get the same live tracking, chat, and ratings — neither side is an afterthought.",
  },
  {
    title: "Trust through ratings",
    text: "Every completed pickup can be rated by both sides, so reputation is earned pickup by pickup, not bought.",
  },
  {
    title: "Simple, not clever",
    text: "Post what you've got, get picked up, get paid. No listings to manage, no bidding wars, no waiting around.",
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

export default function AboutUs() {
  const { user } = useAuth();

  useDocumentMeta({
    title: "About Us",
    description:
      "ScrapConnect connects people with scrap to nearby collectors — no fees, no middlemen, paid on the spot.",
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        {/* Intro */}
        <section className="max-w-3xl mx-auto px-5 pt-16 pb-14 text-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight mb-5"
            >
              About ScrapConnect
            </motion.h1>
            <motion.p variants={fadeUp} className="text-inkSoft text-base leading-relaxed max-w-xl mx-auto">
              We built ScrapConnect to make selling scrap as easy as it should always have been —
              post what you've got, a collector nearby picks it up, and you get paid on the spot.
              No fees, no listing hassle, no middlemen taking a cut.
            </motion.p>
          </motion.div>
        </section>

        {/* Mission */}
        <section className="bg-surface border-y border-line py-16">
          <div className="max-w-3xl mx-auto px-5">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              className="ticket p-6 sm:p-8 text-center"
            >
              <h2 className="font-display text-2xl font-bold text-ink mb-3">Our mission</h2>
              <p className="text-sm text-inkSoft leading-relaxed">
                Scrap that's just sitting around is money left on the table and a missed chance
                to keep it out of landfill. We connect people who have scrap with collectors who
                want it, cutting out the friction on both sides — so recycling something is as
                simple as requesting a ride.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-5 py-16"
        >
          <motion.h2 variants={fadeUp} className="font-display text-2xl font-bold text-ink text-center mb-12">
            What we stand for
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => (
              <motion.div key={v.title} variants={fadeUp} whileHover={{ y: -3 }} className="ticket p-5">
                <h3 className="font-display font-semibold text-ink mb-1.5">{v.title}</h3>
                <p className="text-sm text-inkSoft leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
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

        {user && (
          <div className="max-w-2xl mx-auto px-5 py-12 text-center">
            <Link to={roleHome(user.role)} className="btn-primary">
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}