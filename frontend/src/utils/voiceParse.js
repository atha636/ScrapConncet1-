// Turns a spoken sentence — English, Hindi, Punjabi or a mix — into pickup
// items: "10 kilo lohe aur 2 kilo plastic" -> metal 10, plastic 2.
// Pure and dependency-free so it can be checked without a microphone.

const TYPE_WORDS = {
  metal: [
    "iron", "steel", "metal", "copper", "brass", "aluminium", "aluminum", "loha", "lohe", "lohay", "pital",
    "tamba", "tanba", "लोहा", "लोहे", "स्टील", "तांबा", "तांबे", "पीतल", "एल्युमिनियम", "लोह", "ਲੋਹਾ", "ਲੋਹੇ", "ਪਿੱਤਲ",
    "ਤਾਂਬਾ", "ਸਟੀਲ",
  ],
  plastic: ["plastic", "plastik", "प्लास्टिक", "ਪਲਾਸਟਿਕ"],
  paper: [
    "paper", "newspaper", "newspapers", "cardboard", "carton", "magazine", "books", "book", "kagaz", "kaagaz",
    "raddi", "कागज", "कागज़", "रद्दी", "अखबार", "ਕਾਗਜ਼", "ਕਾਗਜ਼", "ਰੱਦੀ", "ਅਖਬਾਰ",
  ],
  "e-waste": [
    "ewaste", "electronic", "electronics", "laptop", "phone", "mobile", "computer", "tv", "television", "battery",
    "charger", "ई-वेस्ट", "ईवेस्ट", "इलेक्ट्रॉनिक", "ਈ-ਵੇਸਟ", "ਇਲੈਕਟ੍ਰਾਨਿਕ",
  ],
  glass: ["glass", "kaanch", "kanch", "कांच", "काँच", "शीशा", "ਕੱਚ", "ਸ਼ੀਸ਼ਾ"],
  other: ["kabaad", "kabad", "other", "mixed", "कबाड़", "कबाड", "ਕਬਾੜ"],
};

const KG = new Set(["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms", "किलो", "केजी", "किग्रा", "ਕਿਲੋ"]);
const GRAM = new Set(["g", "gm", "gms", "gram", "grams", "ग्राम", "ਗ੍ਰਾਮ"]);
const SEPARATORS = new Set(["and", "plus", "aur", "then", "और", "ਅਤੇ", "ਤੇ", ","]);

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  dus: 10, pandrah: 15, bees: 20, pachchees: 25, pachis: 25, tees: 30, chalis: 40, pachas: 50, sau: 100,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
  "पंद्रह": 15, "बीस": 20, "पच्चीस": 25, "तीस": 30, "चालीस": 40, "पचास": 50, "सौ": 100,
  "ਇੱਕ": 1, "ਦੋ": 2, "ਤਿੰਨ": 3, "ਚਾਰ": 4, "ਪੰਜ": 5, "ਛੇ": 6, "ਸੱਤ": 7, "ਅੱਠ": 8, "ਨੌਂ": 9, "ਦਸ": 10, "ਵੀਹ": 20, "ਪੰਜਾਹ": 50,
  half: 0.5, aadha: 0.5, adha: 0.5, "आधा": 0.5, "ਅੱਧਾ": 0.5, dedh: 1.5, "डेढ़": 1.5, "डेढ": 1.5, dhai: 2.5, "ढाई": 2.5,
};
const TENS = new Set([20, 30, 40, 50]);

const DEVANAGARI = "०१२३४५६७८९";
const GURMUKHI = "੦੧੨੩੪੫੬੭੮੯";

const MAX_PAIR_DISTANCE = 3;
const UNMATCHED_COST = 4;
const MAX_TYPES = 6;

function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d)))
    .replace(/[੦-੯]/g, (d) => String(GURMUKHI.indexOf(d)))
    .replace(/e[\s-]+waste/g, "ewaste")
    .replace(/ई[\s-]+वेस्ट/g, "ईवेस्ट")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/,/g, " , ")
    .replace(/[.;!?]/g, " ")
    .trim();
}

function typeOf(word) {
  for (const [type, words] of Object.entries(TYPE_WORDS)) {
    // prefix match so "lohe", "bottles" or "लोहे से" still hit, but only for words of 3+ letters
    if (words.some((w) => word === w || (w.length >= 3 && word.startsWith(w)))) return type;
  }
  return null;
}

function tokenise(text) {
  const raw = normalise(text).split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    let value = null;
    if (/^\d+(\.\d+)?$/.test(w)) value = parseFloat(w);
    else if (NUMBER_WORDS[w] !== undefined) value = NUMBER_WORDS[w];

    if (value !== null) {
      // "twenty five" -> 25
      const next = NUMBER_WORDS[raw[i + 1]];
      if (TENS.has(value) && next !== undefined && next >= 1 && next <= 9) {
        value += next;
        i++;
      }
      out.push({ kind: "num", value });
    } else if (SEPARATORS.has(w)) out.push({ kind: "sep" });
    else if (KG.has(w)) out.push({ kind: "unit", factor: 1 });
    else if (GRAM.has(w)) out.push({ kind: "unit", factor: 0.001 });
    else {
      const type = typeOf(w);
      out.push(type ? { kind: "type", type } : { kind: "word" });
    }
  }
  return out;
}

const crossesSeparator = (tokens, a, b) => {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  for (let i = lo + 1; i < hi; i++) if (tokens[i].kind === "sep") return true;
  return false;
};

/**
 * @returns {{ items: {scrapType:string, weight:string}[], heard: boolean }}
 *   heard=false when no scrap type was recognised at all.
 */
export function parseVoiceRequest(text) {
  const tokens = tokenise(text);

  const types = tokens.map((t, i) => (t.kind === "type" ? { i, type: t.type } : null)).filter(Boolean).slice(0, MAX_TYPES);
  if (types.length === 0) return { items: [], heard: false };

  const numbers = tokens
    .map((t, i) => {
      if (t.kind !== "num") return null;
      const unit = tokens[i + 1]?.kind === "unit" ? tokens[i + 1].factor : 1;
      return { i, kg: t.value * unit };
    })
    .filter(Boolean);

  // Pair each type with its nearest unused number, choosing the assignment
  // with the smallest total distance (so "10 kg iron 2 kg plastic" pairs correctly).
  const dist = (t, n) => (crossesSeparator(tokens, t.i, n.i) || Math.abs(t.i - n.i) > MAX_PAIR_DISTANCE ? Infinity : Math.abs(t.i - n.i));
  let best = { cost: Infinity, pick: [] };
  const search = (ti, used, cost, pick) => {
    if (cost >= best.cost) return;
    if (ti === types.length) {
      best = { cost, pick };
      return;
    }
    search(ti + 1, used, cost + UNMATCHED_COST, [...pick, null]);
    numbers.forEach((n, ni) => {
      if (used.has(ni)) return;
      const d = dist(types[ti], n);
      if (d === Infinity) return;
      search(ti + 1, new Set(used).add(ni), cost + d, [...pick, ni]);
    });
  };
  search(0, new Set(), 0, []);

  const merged = new Map();
  types.forEach((t, k) => {
    const ni = best.pick[k];
    const kg = ni == null ? 0 : numbers[ni].kg;
    merged.set(t.type, (merged.get(t.type) || 0) + kg);
  });

  const items = [...merged.entries()].map(([scrapType, kg]) => ({
    scrapType,
    weight: kg > 0 ? String(Math.round(kg * 100) / 100) : "",
  }));
  return { items, heard: true };
}