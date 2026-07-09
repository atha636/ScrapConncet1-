import { Link } from "react-router-dom";
import useDocumentMeta from "../hooks/useDocumentMeta";

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

export default function Home() {
  useDocumentMeta({
    title: "Sell Your Scrap, Get Picked Up Fast",
    description:
      "ScrapConnect connects people with scrap metal, plastic, paper, and e-waste to nearby collectors. Request a pickup in minutes and get paid.",
  });

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-rust flex items-center justify-center rotate-[-3deg]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2.3">
                <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg text-ink tracking-tight">ScrapConnect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary !py-2 !px-4 text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight mb-5">
            Turn your scrap<br />into cash, today.
          </h1>
          <p className="text-inkSoft text-base leading-relaxed mb-8 max-w-md">
            Post what you've got and a collector nearby picks it up, weighs it, and pays you
            on the spot. No fees, no middlemen, no listing hassle.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary">Request a pickup</Link>
            <Link to="/register" className="btn-secondary">Become a collector</Link>
          </div>
        </div>

        <div className="flex items-center justify-center">
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
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface border-y border-line py-16">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-2xl font-bold text-ink text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="w-10 h-10 rounded-full bg-rust text-surface font-display font-bold flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-display font-semibold text-ink mb-2">{s.title}</h3>
                <p className="text-sm text-inkSoft leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="ticket p-5">
              <h3 className="font-display font-semibold text-ink mb-1.5">{f.title}</h3>
              <p className="text-sm text-inkSoft leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-rust py-16">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-surface mb-4">
            Ready to clear out your scrap?
          </h2>
          <p className="text-surface/80 mb-8">Join free — takes less than a minute.</p>
          <Link to="/register" className="inline-flex btn-primary !bg-surface !text-rust hover:!bg-surfaceRaised">
            Create your account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-inkFaint">
          <span>© {new Date().getFullYear()} ScrapConnect</span>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-rust">Sign in</Link>
            <Link to="/register" className="hover:text-rust">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}