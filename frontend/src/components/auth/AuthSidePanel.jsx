const FEATURES = [
  {
    title: "No listing fees",
    text: "Post a pickup request in under a minute — completely free.",
  },
  {
    title: "Live status tracking",
    text: "Watch your request move from pending to accepted to completed, in real time.",
  },
  {
    title: "Talk to your collector",
    text: "Built-in chat so you can coordinate timing and exact location directly.",
  },
];

const COPY = {
  login: {
    heading: <>Turn your scrap<br />into cash, today.</>,
    body: "Post what you've got — metal, e-waste, plastic, paper — and a collector nearby picks it up, weighs it, and pays you on the spot.",
  },
  register: {
    heading: <>List it, or<br />pick it up.</>,
    body: "Whether you've got scrap to sell or a route to run, ScrapConnect connects requesters and collectors directly — no middlemen.",
  },
};

export default function AuthSidePanel({ variant = "login" }) {
  const copy = COPY[variant] || COPY.login;

  return (
    <div className="hidden lg:flex flex-col justify-between w-[46%] bg-rust relative overflow-hidden px-12 py-14">
      {/* Subtle dot texture, consistent with the kraft-paper background elsewhere */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #FAF5EA 1.5px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2.5 mb-16">
          <div className="w-8 h-8 rounded-md bg-surface flex items-center justify-center rotate-[-3deg]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A63D24" strokeWidth="2.3">
              <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-surface tracking-tight">ScrapConnect</span>
        </div>

        <h2 className="font-display text-3xl font-bold text-surface leading-tight mb-4">
          {copy.heading}
        </h2>
        <p className="text-surface/80 text-sm leading-relaxed max-w-sm">
          {copy.body}
        </p>
      </div>

      {/* Illustration: scrap yard scene — scale, truck, recycling arrows */}
      <div className="relative flex items-center justify-center py-8">
        <svg width="280" height="200" viewBox="0 0 280 200" fill="none">
          {/* Ground line */}
          <line x1="10" y1="170" x2="270" y2="170" stroke="#FAF5EA" strokeOpacity="0.25" strokeWidth="2" />

          {/* Weighing scale */}
          <g transform="translate(30, 90)">
            <rect x="0" y="60" width="14" height="20" rx="2" fill="#FAF5EA" fillOpacity="0.9" />
            <rect x="-10" y="78" width="34" height="6" rx="2" fill="#FAF5EA" fillOpacity="0.9" />
            <line x1="7" y1="60" x2="7" y2="10" stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" />
            <line x1="-25" y1="10" x2="39" y2="10" stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" />
            <circle cx="-25" cy="30" r="16" fill="none" stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" />
            <circle cx="39" cy="22" r="16" fill="none" stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" />
            <path d="M-25 10 L-25 22" stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="2" />
            <path d="M39 10 L39 22" stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="2" />
          </g>

          {/* Recycling arrows (circular) */}
          <g transform="translate(150, 40)">
            <path
              d="M20 0 A20 20 0 0 1 38 15 L32 13 M38 15 L34 22"
              stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M20 40 A20 20 0 0 1 2 25 L8 27 M2 25 L6 18"
              stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M0 20 A20 20 0 0 1 15 1 L14 8 M15 1 L22 4"
              stroke="#FAF5EA" strokeOpacity="0.9" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
          </g>

          {/* Collection truck */}
          <g transform="translate(180, 120)">
            <rect x="0" y="0" width="55" height="30" rx="3" fill="#FAF5EA" fillOpacity="0.95" />
            <path d="M55 10 h18 l12 12 v8 h-30 z" fill="#FAF5EA" fillOpacity="0.7" />
            <circle cx="16" cy="34" r="8" fill="#A63D24" stroke="#FAF5EA" strokeWidth="2.5" />
            <circle cx="70" cy="34" r="8" fill="#A63D24" stroke="#FAF5EA" strokeWidth="2.5" />
            <rect x="62" y="15" width="10" height="8" rx="1" fill="#A63D24" fillOpacity="0.4" />
          </g>

          {/* Small scattered scrap pieces */}
          <circle cx="245" cy="165" r="4" fill="#FAF5EA" fillOpacity="0.5" />
          <rect x="255" y="160" width="10" height="10" rx="2" fill="#FAF5EA" fillOpacity="0.5" transform="rotate(15 260 165)" />
        </svg>
      </div>

      <div className="relative space-y-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-surface/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="text-surface text-sm font-semibold">{f.title}</div>
              <div className="text-surface/70 text-xs leading-relaxed mt-0.5">{f.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}