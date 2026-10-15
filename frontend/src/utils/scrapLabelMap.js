// Turns what an image classifier "sees" (ImageNet labels such as "water
// bottle" or "laptop, laptop computer") into ScrapConnect's scrap types.
// Pure and dependency-free so it can be checked without loading the model.
//
// Order matters only for display; every label is tested against every
// category and its probability is added to each category it matches.

const KEYWORDS = {
  "e-waste": [
    "monitor", "television", "crt screen", "laptop", "notebook", "desktop computer", "computer keyboard",
    "computer mouse", "cellular telephone", "cellphone", "dial telephone", "pay-phone", "remote control", "printer",
    "modem", "hard disc", "ipod", "radio", "joystick", "projector", "loudspeaker", "speaker", "cassette player",
    "tape player", "microphone", "electric fan", "toaster", "vacuum", "space heater", "washer", "refrigerator",
    "microwave", "dishwasher", "stove", "hair dryer", "power drill", "digital clock", "digital watch", "iron",
    "camera", "reflex camera", "polaroid", "photocopier", "surge protector",
  ],
  plastic: [
    "water bottle", "pop bottle", "plastic bag", "water jug", "jug", "pill bottle", "lotion", "sunscreen",
    "soap dispenser", "measuring cup", "bucket", "pail", "ashcan", "trash can", "crate", "diaper", "shower cap",
    "pitcher", "tub", "bubble", "hamper", "wheelie", "tray", 
  ],
  glass: [
    "beer bottle", "wine bottle", "red wine", "beer glass", "goblet", "vase", "perfume", "whiskey jug",
    "wine glass", "cocktail glass", "lampshade", "light bulb", "jar", "beaker",
  ],
  paper: [
    "carton", "envelope", "packet", "paper towel", "toilet tissue", "book jacket", "comic book", "menu",
    "binder", "crossword", "newspaper", "magazine", "paper", "cardboard", "web site", 
     
  ],
  metal: [
    "chain", "nail", "screw", "hammer", "padlock", "wrench", "can opener", "tin", "frying pan", "wok",
    "caldron", "ladle", "barbell", "dumbbell", "manhole cover", "bicycle", "mountain bike", "shopping cart",
    "wheelbarrow", "radiator", "oil filter", "plate rack", "cleaver", "hatchet", "axe", "shovel", "plow",
    "spatula", "strainer", "pole", "car wheel", "grille", "bolt", "buckle", "safety pin", "sewing machine",
    "steel", "barrel", "tricycle", "scooter", "moped", "chainsaw", "lawn mower", "anvil",
    "cannon", "rotisserie", "gong", "padlock", "chain mail", "spindle", "bannister", "turnstile",
  ],
};

// Do not use "screen"/"window screen" for e-waste on its own: ImageNet's
// "window screen" is a mesh, so only "crt screen" counts.
const MIN_MAPPED_PROBABILITY = 0.06; // below this the model saw nothing scrap-like
const MIN_SHARE = 0.18; // a category needs this share of the mapped probability to be offered

// Whole-word match, so "tin" doesn't fire inside "Tinca" or "pot" inside "potpie".
const PATTERNS = Object.fromEntries(
  Object.entries(KEYWORDS).map(([type, words]) => [type, new RegExp(`\\b(?:${words.join("|")})\\b`)])
);
const matches = (label, type) => PATTERNS[type].test(label);

/**
 * @param {{className:string, probability:number}[]} predictions
 * @returns {{scrapType:string, share:number}[]} best first; empty when nothing
 *   scrap-like was recognised (caller should ask the user to pick manually).
 */
export function mapPredictions(predictions) {
  const totals = {};
  let mapped = 0;

  for (const { className, probability } of predictions || []) {
    const label = String(className || "").toLowerCase();
    const hit = Object.keys(KEYWORDS).find((type) => matches(label, type));
    if (!hit) continue;
    totals[hit] = (totals[hit] || 0) + probability;
    mapped += probability;
  }

  if (mapped < MIN_MAPPED_PROBABILITY) return [];

  return Object.entries(totals)
    .map(([scrapType, p]) => ({ scrapType, share: p / mapped }))
    .filter((r) => r.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share)
    .slice(0, 3);
}