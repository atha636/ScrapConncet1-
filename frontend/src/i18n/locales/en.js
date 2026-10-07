// English is the source of truth: every other locale is a partial overlay,
// and any key missing there falls back to the string below.
const en = {
  lang: { name: "English", short: "EN", switchTo: "Language" },

  nav: {
    home: "Home",
    dashboard: "Dashboard",
    requestPickup: "Request pickup",
    myRequests: "My requests",
    about: "About us",
    rates: "Scrap Rates",
    impact: "My Impact",
    more: "More",
    quotes: "Compare quotes",
    collector: "Collector",
    admin: "Admin",
    profile: "Profile",
    logout: "Log out",
    logoutTitle: "Log out?",
    logoutMessage: "You'll need to sign in again to access your account.",
    cancel: "Cancel",
    homeAria: "ScrapConnect home",
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
    toggleMenu: "Toggle menu",
  },

  status: {
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  },

  scrap: {
    metal: "Metal",
    plastic: "Plastic",
    paper: "Paper",
    "e-waste": "E-waste",
    glass: "Glass",
    other: "Other",
    moreItems: "{first} + {n} more",
  },

  auth: {
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to your account",
    email: "Email",
    password: "Password",
    forgot: "Forgot password?",
    passwordPlaceholder: "Enter your password",
    show: "Show password",
    hide: "Hide password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    or: "or",
    noAccount: "Don't have an account?",
    createOne: "Create one",
    badLogin: "Invalid email or password.",
    noFees: "No listing fees",
    liveTracking: "Live tracking",
    ratedCollectors: "Rated collectors",
  },

  greet: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    there: "there",
  },

  userDash: {
    subtitle: "Here's what's happening with your pickups.",
    total: "Total requests",
    pending: "Pending",
    completed: "Completed",
    earned: "Total earned",
    recent: "Recent activity",
    viewAll: "View all",
    empty: "No pickups yet — request your first one.",
    requestCta: "Request a pickup",
  },

  collectorDash: {
    tabAvailable: "Available",
    tabMine: "My jobs",
    tabHistory: "History",
    tabWallet: "Wallet",
    tabProfile: "Profile & stats",
    startPickup: "Start pickup",
    markCompleted: "Mark completed",
    updating: "Updating…",
    chat: "Chat",
    report: "Report",
  },

  handshake: {
    yourCode: "Your start code",
    codeHint:
      "Tell this to the collector when they arrive. The pickup can't start without it — don't share it beforehand.",
    enterTitle: "Enter start code",
    enterHint: "Ask the requester for their 4-digit code to confirm you've arrived.",
    checking: "Checking…",
    codeFallbackError: "Couldn't verify that code — try again.",
  },

  weigh: {
    title: "Weigh & add a photo",
    hint: "Enter the actual weighed weight and add a photo of the collected scrap — together they're the evidence if anything's ever disputed.",
    est: "est. {kg}kg",
    takePhoto: "Take or choose a photo",
    optimizing: "Optimizing…",
    submit: "Mark completed",
    submitting: "Submitting…",
    submitError: "Couldn't submit the completion details. Try again.",
  },

  settlement: {
    title: "Weighed amount",
    newPrice: "New price",
    was: "was {price}",
    explain:
      "Confirm it, or dispute if the weight looks wrong. It auto-confirms if you don't respond.",
    confirm: "Confirm price",
    working: "Working…",
    dispute: "Dispute",
    disputed: "Disputed — an admin is reviewing it. The payout is on hold until then.",
    finalPrice: "Final price",
    auto_confirmed: "Weight matched the estimate — price unchanged.",
    confirmed: "You confirmed the weighed amount.",
    resolved: "Settled by an admin after your dispute.",
    genericError: "Something went wrong — try again.",
  },

  common: { cancel: "Cancel", close: "Close", save: "Save" },
};

export default en;