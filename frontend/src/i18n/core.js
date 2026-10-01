import { createContext, useContext } from "react";
import en from "./locales/en";
import hi from "./locales/hi";
import pa from "./locales/pa";

export const LANGUAGES = [
  { code: "en", ...en.lang },
  { code: "hi", ...hi.lang },
  { code: "pa", ...pa.lang },
];

export const DICTS = { en, hi, pa };
export const STORAGE_KEY = "scrapconnect.lang";

// Dot-path lookup ("nav.home"). Returns undefined when the path is missing
// or doesn't end at a string.
function lookup(dict, key) {
  const v = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
  return typeof v === "string" ? v : undefined;
}

// "{n} more" -> replaces {n} from vars; unknown placeholders are left alone.
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : String(vars[k])));
}

// Missing key in the chosen language falls back to English, and a key
// missing everywhere renders the key itself, so a gap is visible in dev
// instead of a blank label.
export function translate(lang, key, vars) {
  const str = lookup(DICTS[lang], key) ?? lookup(en, key) ?? key;
  return interpolate(str, vars);
}

export function detectInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* storage can be blocked — fall through to browser language */
  }
  const nav = (typeof navigator !== "undefined" && navigator.language) || "en";
  const base = nav.slice(0, 2).toLowerCase();
  return DICTS[base] ? base : "en";
}

// Default value = English with a no-op setter, so any component (and every
// existing test that renders one without a provider) still works unchanged.
export const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key, vars) => translate("en", key, vars),
});

export function useT() {
  return useContext(LanguageContext);
}