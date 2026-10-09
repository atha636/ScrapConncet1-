// Punjabi (Gurmukhi). Overlay on en.js — anything not listed falls back to English.
const pa = {
  lang: { name: "ਪੰਜਾਬੀ", short: "ਪੰ", switchTo: "ਭਾਸ਼ਾ" },

  nav: {
    home: "ਹੋਮ",
    dashboard: "ਡੈਸ਼ਬੋਰਡ",
    requestPickup: "ਪਿਕਅੱਪ ਦੀ ਬੇਨਤੀ ਕਰੋ",
    myRequests: "ਮੇਰੀਆਂ ਬੇਨਤੀਆਂ",
    about: "ਸਾਡੇ ਬਾਰੇ",
    rates: "ਸਕਰੈਪ ਰੇਟ",
    impact: "ਮੇਰਾ ਪ੍ਰਭਾਵ",
    more: "ਹੋਰ",
    quotes: "ਕੋਟ ਦੀ ਤੁਲਨਾ",
    collector: "ਕਲੈਕਟਰ",
    admin: "ਐਡਮਿਨ",
    profile: "ਪ੍ਰੋਫਾਈਲ",
    logout: "ਲੌਗ ਆਊਟ",
    logoutTitle: "ਲੌਗ ਆਊਟ ਕਰਨਾ ਹੈ?",
    logoutMessage: "ਆਪਣੇ ਖਾਤੇ ਤੱਕ ਪਹੁੰਚਣ ਲਈ ਤੁਹਾਨੂੰ ਦੁਬਾਰਾ ਸਾਈਨ ਇਨ ਕਰਨਾ ਪਵੇਗਾ।",
    cancel: "ਰੱਦ ਕਰੋ",
    homeAria: "ScrapConnect ਹੋਮ",
    toLight: "ਲਾਈਟ ਮੋਡ ਚਾਲੂ ਕਰੋ",
    toDark: "ਡਾਰਕ ਮੋਡ ਚਾਲੂ ਕਰੋ",
    toggleMenu: "ਮੀਨੂ ਖੋਲ੍ਹੋ/ਬੰਦ ਕਰੋ",
  },

  status: {
    pending: "ਬਕਾਇਆ",
    accepted: "ਮਨਜ਼ੂਰ",
    in_progress: "ਜਾਰੀ ਹੈ",
    completed: "ਪੂਰਾ ਹੋਇਆ",
    cancelled: "ਰੱਦ",
  },

  scrap: {
    metal: "ਧਾਤ",
    plastic: "ਪਲਾਸਟਿਕ",
    paper: "ਕਾਗਜ਼",
    "e-waste": "ਈ-ਕਚਰਾ",
    glass: "ਸ਼ੀਸ਼ਾ",
    other: "ਹੋਰ",
    moreItems: "{first} + {n} ਹੋਰ",
  },

  auth: {
    loginTitle: "ਜੀ ਆਇਆਂ ਨੂੰ",
    loginSubtitle: "ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਸਾਈਨ ਇਨ ਕਰੋ",
    email: "ਈਮੇਲ",
    password: "ਪਾਸਵਰਡ",
    forgot: "ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?",
    passwordPlaceholder: "ਆਪਣਾ ਪਾਸਵਰਡ ਭਰੋ",
    show: "ਪਾਸਵਰਡ ਦਿਖਾਓ",
    hide: "ਪਾਸਵਰਡ ਲੁਕਾਓ",
    signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
    signingIn: "ਸਾਈਨ ਇਨ ਹੋ ਰਿਹਾ ਹੈ…",
    or: "ਜਾਂ",
    noAccount: "ਖਾਤਾ ਨਹੀਂ ਹੈ?",
    createOne: "ਨਵਾਂ ਬਣਾਓ",
    badLogin: "ਈਮੇਲ ਜਾਂ ਪਾਸਵਰਡ ਗਲਤ ਹੈ।",
    noFees: "ਕੋਈ ਲਿਸਟਿੰਗ ਫੀਸ ਨਹੀਂ",
    liveTracking: "ਲਾਈਵ ਟ੍ਰੈਕਿੰਗ",
    ratedCollectors: "ਰੇਟਿੰਗ ਵਾਲੇ ਕਲੈਕਟਰ",
  },

  greet: {
    morning: "ਸ਼ੁਭ ਸਵੇਰ",
    afternoon: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    evening: "ਸ਼ੁਭ ਸ਼ਾਮ",
    there: "ਦੋਸਤ",
  },

  userDash: {
    subtitle: "ਤੁਹਾਡੇ ਪਿਕਅੱਪਾਂ ਦੀ ਤਾਜ਼ਾ ਸਥਿਤੀ ਇੱਥੇ ਹੈ।",
    total: "ਕੁੱਲ ਬੇਨਤੀਆਂ",
    pending: "ਬਕਾਇਆ",
    completed: "ਪੂਰੀਆਂ ਹੋਈਆਂ",
    earned: "ਕੁੱਲ ਕਮਾਈ",
    recent: "ਹਾਲ ਦੀ ਗਤੀਵਿਧੀ",
    viewAll: "ਸਭ ਵੇਖੋ",
    empty: "ਹਾਲੇ ਕੋਈ ਪਿਕਅੱਪ ਨਹੀਂ — ਆਪਣੀ ਪਹਿਲੀ ਬੇਨਤੀ ਕਰੋ।",
    requestCta: "ਪਿਕਅੱਪ ਦੀ ਬੇਨਤੀ ਕਰੋ",
  },

  collectorDash: {
    tabAvailable: "ਉਪਲਬਧ",
    tabMine: "ਮੇਰੇ ਕੰਮ",
    tabHistory: "ਇਤਿਹਾਸ",
    tabRecycle: "ਰੀਸਾਈਕਲ",
    tabWallet: "ਵਾਲਿਟ",
    tabProfile: "ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਅੰਕੜੇ",
    startPickup: "ਪਿਕਅੱਪ ਸ਼ੁਰੂ ਕਰੋ",
    markCompleted: "ਪੂਰਾ ਹੋਇਆ ਚਿੰਨ੍ਹਿਤ ਕਰੋ",
    updating: "ਅੱਪਡੇਟ ਹੋ ਰਿਹਾ ਹੈ…",
    chat: "ਚੈਟ",
    report: "ਸ਼ਿਕਾਇਤ",
  },

  handshake: {
    yourCode: "ਤੁਹਾਡਾ ਸਟਾਰਟ ਕੋਡ",
    codeHint:
      "ਕਲੈਕਟਰ ਦੇ ਪਹੁੰਚਣ ਤੇ ਉਨ੍ਹਾਂ ਨੂੰ ਇਹ ਕੋਡ ਦੱਸੋ। ਇਸ ਤੋਂ ਬਿਨਾਂ ਪਿਕਅੱਪ ਸ਼ੁਰੂ ਨਹੀਂ ਹੋਵੇਗਾ — ਪਹਿਲਾਂ ਕਿਸੇ ਨੂੰ ਨਾ ਦੱਸੋ।",
    enterTitle: "ਸਟਾਰਟ ਕੋਡ ਭਰੋ",
    enterHint: "ਪਹੁੰਚਣ ਦੀ ਪੁਸ਼ਟੀ ਲਈ ਬੇਨਤੀਕਰਤਾ ਤੋਂ ਉਨ੍ਹਾਂ ਦਾ 4 ਅੰਕਾਂ ਦਾ ਕੋਡ ਮੰਗੋ।",
    checking: "ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ…",
    codeFallbackError: "ਕੋਡ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੋ ਸਕੀ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
  },

  weigh: {
    title: "ਤੋਲੋ ਅਤੇ ਫੋਟੋ ਜੋੜੋ",
    hint: "ਅਸਲ ਤੋਲਿਆ ਹੋਇਆ ਵਜ਼ਨ ਭਰੋ ਅਤੇ ਇਕੱਠੇ ਕੀਤੇ ਕਬਾੜ ਦੀ ਫੋਟੋ ਜੋੜੋ — ਕਿਸੇ ਵਿਵਾਦ ਦੀ ਸੂਰਤ ਵਿੱਚ ਇਹੀ ਸਬੂਤ ਹੋਵੇਗਾ।",
    est: "ਅੰਦਾਜ਼ਾ {kg} ਕਿਲੋ",
    takePhoto: "ਫੋਟੋ ਲਵੋ ਜਾਂ ਚੁਣੋ",
    proofPhotoLabel: "1. ਇਕੱਠੇ ਕੀਤੇ ਕਬਾੜ ਦੀ ਫੋਟੋ",
    scalePhotoLabel: "2. ਤੱਕੜੀ ਜਾਂ ਤੋਲੇ ਮਾਲ ਦੀ ਫੋਟੋ",
    optimizing: "ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ…",
    submit: "ਪੂਰਾ ਹੋਇਆ ਚਿੰਨ੍ਹਿਤ ਕਰੋ",
    submitting: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ…",
    submitError: "ਵੇਰਵੇ ਜਮ੍ਹਾਂ ਨਹੀਂ ਹੋ ਸਕੇ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
  },

  settlement: {
    title: "ਤੋਲਿਆ ਹੋਇਆ ਵਜ਼ਨ",
    newPrice: "ਨਵੀਂ ਕੀਮਤ",
    was: "ਪਹਿਲਾਂ {price}",
    explain:
      "ਇਸਨੂੰ ਪੱਕਾ ਕਰੋ, ਜਾਂ ਵਜ਼ਨ ਗਲਤ ਲੱਗੇ ਤਾਂ ਵਿਵਾਦ ਦਰਜ ਕਰੋ। ਜਵਾਬ ਨਾ ਦੇਣ ਤੇ ਇਹ ਆਪਣੇ-ਆਪ ਪੱਕਾ ਹੋ ਜਾਵੇਗਾ।",
    confirm: "ਕੀਮਤ ਪੱਕੀ ਕਰੋ",
    working: "ਹੋ ਰਿਹਾ ਹੈ…",
    dispute: "ਵਿਵਾਦ ਦਰਜ ਕਰੋ",
    disputed: "ਵਿਵਾਦ ਦਰਜ ਹੈ — ਐਡਮਿਨ ਜਾਂਚ ਰਹੇ ਹਨ। ਉਦੋਂ ਤੱਕ ਭੁਗਤਾਨ ਰੁਕਿਆ ਰਹੇਗਾ।",
    finalPrice: "ਅੰਤਿਮ ਕੀਮਤ",
    auto_confirmed: "ਵਜ਼ਨ ਅੰਦਾਜ਼ੇ ਨਾਲ ਮੇਲ ਖਾਂਦਾ ਹੈ — ਕੀਮਤ ਵਿੱਚ ਕੋਈ ਬਦਲਾਅ ਨਹੀਂ।",
    confirmed: "ਤੁਸੀਂ ਤੋਲੇ ਹੋਏ ਵਜ਼ਨ ਨੂੰ ਪੱਕਾ ਕੀਤਾ।",
    resolved: "ਤੁਹਾਡੇ ਵਿਵਾਦ ਤੋਂ ਬਾਅਦ ਐਡਮਿਨ ਨੇ ਨਿਪਟਾਰਾ ਕੀਤਾ।",
    genericError: "ਕੁਝ ਗੜਬੜ ਹੋਈ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
  },

  common: { cancel: "ਰੱਦ ਕਰੋ", close: "ਬੰਦ ਕਰੋ", save: "ਸੰਭਾਲੋ" },
};

export default pa;