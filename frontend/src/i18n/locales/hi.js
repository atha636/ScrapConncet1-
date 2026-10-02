// Hindi (Devanagari). Overlay on en.js — anything not listed falls back to English.
const hi = {
  lang: { name: "हिन्दी", short: "हिं", switchTo: "भाषा" },

  nav: {
    home: "होम",
    dashboard: "डैशबोर्ड",
    requestPickup: "पिकअप का अनुरोध करें",
    myRequests: "मेरे अनुरोध",
    about: "हमारे बारे में",
    rates: "स्क्रैप दरें",
    collector: "कलेक्टर",
    admin: "एडमिन",
    profile: "प्रोफ़ाइल",
    logout: "लॉग आउट",
    logoutTitle: "लॉग आउट करें?",
    logoutMessage: "अपने खाते तक पहुँचने के लिए आपको दोबारा साइन इन करना होगा।",
    cancel: "रद्द करें",
    homeAria: "ScrapConnect होम",
    toLight: "लाइट मोड चालू करें",
    toDark: "डार्क मोड चालू करें",
    toggleMenu: "मेनू खोलें/बंद करें",
  },

  status: {
    pending: "लंबित",
    accepted: "स्वीकृत",
    in_progress: "जारी है",
    completed: "पूरा हुआ",
    cancelled: "रद्द",
  },

  scrap: {
    metal: "धातु",
    plastic: "प्लास्टिक",
    paper: "कागज़",
    "e-waste": "ई-कचरा",
    glass: "काँच",
    other: "अन्य",
    moreItems: "{first} + {n} और",
  },

  auth: {
    loginTitle: "वापसी पर स्वागत है",
    loginSubtitle: "अपने खाते में साइन इन करें",
    email: "ईमेल",
    password: "पासवर्ड",
    forgot: "पासवर्ड भूल गए?",
    passwordPlaceholder: "अपना पासवर्ड डालें",
    show: "पासवर्ड दिखाएँ",
    hide: "पासवर्ड छिपाएँ",
    signIn: "साइन इन करें",
    signingIn: "साइन इन हो रहा है…",
    or: "या",
    noAccount: "खाता नहीं है?",
    createOne: "नया बनाएँ",
    badLogin: "ईमेल या पासवर्ड गलत है।",
    noFees: "कोई लिस्टिंग शुल्क नहीं",
    liveTracking: "लाइव ट्रैकिंग",
    ratedCollectors: "रेटेड कलेक्टर",
  },

  greet: {
    morning: "सुप्रभात",
    afternoon: "नमस्कार",
    evening: "शुभ संध्या",
    there: "दोस्त",
  },

  userDash: {
    subtitle: "आपके पिकअप की ताज़ा स्थिति यहाँ है।",
    total: "कुल अनुरोध",
    pending: "लंबित",
    completed: "पूरे हुए",
    earned: "कुल कमाई",
    recent: "हाल की गतिविधि",
    viewAll: "सभी देखें",
    empty: "अभी कोई पिकअप नहीं — अपना पहला अनुरोध करें।",
    requestCta: "पिकअप का अनुरोध करें",
  },

  collectorDash: {
    tabAvailable: "उपलब्ध",
    tabMine: "मेरे काम",
    tabHistory: "इतिहास",
    tabWallet: "वॉलेट",
    tabProfile: "प्रोफ़ाइल और आँकड़े",
    startPickup: "पिकअप शुरू करें",
    markCompleted: "पूरा हुआ चिह्नित करें",
    updating: "अपडेट हो रहा है…",
    chat: "चैट",
    report: "शिकायत",
  },

  handshake: {
    yourCode: "आपका स्टार्ट कोड",
    codeHint:
      "कलेक्टर के पहुँचने पर उन्हें यह कोड बताएँ। इसके बिना पिकअप शुरू नहीं होगा — पहले किसी को न बताएँ।",
    enterTitle: "स्टार्ट कोड डालें",
    enterHint: "पहुँचने की पुष्टि के लिए अनुरोधकर्ता से उनका 4 अंकों का कोड माँगें।",
    checking: "जाँच हो रही है…",
    codeFallbackError: "कोड सत्यापित नहीं हो सका — फिर कोशिश करें।",
  },

  weigh: {
    title: "तौलें और फ़ोटो जोड़ें",
    hint: "असल तौला हुआ वज़न डालें और इकट्ठा किए गए कबाड़ की फ़ोटो जोड़ें — किसी विवाद की स्थिति में यही सबूत होगा।",
    est: "अनुमान {kg} किग्रा",
    takePhoto: "फ़ोटो लें या चुनें",
    optimizing: "तैयार हो रहा है…",
    submit: "पूरा हुआ चिह्नित करें",
    submitting: "जमा हो रहा है…",
    submitError: "विवरण जमा नहीं हो सका। फिर कोशिश करें।",
  },

  settlement: {
    title: "तौला हुआ वज़न",
    newPrice: "नई कीमत",
    was: "पहले {price}",
    explain:
      "इसे पक्का करें, या वज़न गलत लगे तो विवाद दर्ज करें। जवाब न देने पर यह अपने-आप पक्का हो जाएगा।",
    confirm: "कीमत पक्की करें",
    working: "हो रहा है…",
    dispute: "विवाद दर्ज करें",
    disputed: "विवाद दर्ज है — एडमिन जाँच रहे हैं। तब तक भुगतान रुका रहेगा।",
    finalPrice: "अंतिम कीमत",
    auto_confirmed: "वज़न अनुमान से मेल खाता है — कीमत में कोई बदलाव नहीं।",
    confirmed: "आपने तौले हुए वज़न को पक्का किया।",
    resolved: "आपके विवाद के बाद एडमिन ने निपटारा किया।",
    genericError: "कुछ गड़बड़ हुई — फिर कोशिश करें।",
  },

  common: { cancel: "रद्द करें", close: "बंद करें", save: "सहेजें" },
};

export default hi;