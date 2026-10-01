import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useT } from "../../i18n/core";

/**
 * Compact language picker: a globe button showing the current language's
 * short code, opening a small menu with each language written in its own
 * script (so someone who can't read the current UI language can still find
 * theirs). `floating` pins it top-right for pages with no navbar (login,
 * register, home).
 */
export default function LanguageToggle({ floating = false }) {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={floating ? "fixed top-3 right-3 z-50" : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("lang.switchTo")}: ${current.name}`}
        title={t("lang.switchTo")}
        className="h-9 px-2.5 rounded-md border border-line bg-surface flex items-center gap-1.5 text-xs font-semibold text-inkSoft hover:text-rust hover:border-rust/50 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
        {current.short}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("lang.switchTo")}
          className="absolute right-0 mt-1.5 min-w-[9rem] rounded-md border border-line bg-surface shadow-[0_6px_20px_rgba(36,26,18,0.12)] py-1 z-50"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                lang={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 hover:bg-line/40 ${
                  l.code === lang ? "text-rust font-semibold" : "text-ink"
                }`}
              >
                {l.name}
                {l.code === lang && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}