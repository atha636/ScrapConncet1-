import { useCallback, useEffect, useMemo, useState } from "react";
import { DICTS, LanguageContext, STORAGE_KEY, detectInitial, translate } from "./core";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitial);

  // Keeps <html lang> in sync — screen readers pick the right voice and the
  // browser picks the right font/hyphenation for Devanagari/Gurmukhi text.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-fatal: the choice just won't persist */
    }
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}