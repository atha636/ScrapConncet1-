import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseVoiceRequest } from "../../utils/voiceParse";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";
import { useT } from "../../i18n/core";

const LANGS = [
  { code: "en-IN", label: "English", hint: "“10 kg iron and 2 kg plastic”" },
  { code: "hi-IN", label: "हिन्दी", hint: "“दस किलो लोहा और दो किलो प्लास्टिक”" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ", hint: "“ਦਸ ਕਿਲੋ ਲੋਹਾ ਤੇ ਦੋ ਕਿਲੋ ਪਲਾਸਟਿਕ”" },
];

const fromAppLang = (lang) => (lang === "hi" ? "hi-IN" : lang === "pa" ? "pa-IN" : "en-IN");

/**
 * "Speak your request" — fills the items list from speech. Free: uses the
 * browser's built-in recognition. Nothing is applied until the user confirms.
 */
export default function VoiceRequest({ onApply }) {
  const { lang: appLang } = useT();
  const [lang, setLang] = useState(() => fromAppLang(appLang));
  const [dismissed, setDismissed] = useState(false);
  const { supported, listening, transcript, error, start, stop } = useSpeechRecognition(lang);

  const parsed = useMemo(() => (!listening && transcript ? parseVoiceRequest(transcript) : null), [listening, transcript]);
  const current = LANGS.find((l) => l.code === lang);

  if (!supported) {
    return <p className="text-[11px] text-inkFaint mb-2.5">Voice input isn't supported in this browser — try Chrome.</p>;
  }

  const apply = () => {
    onApply(parsed.items);
    setDismissed(true);
  };

  return (
    <div className="mb-3 rounded-ticket border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={listening ? stop : () => { setDismissed(false); start(); }}
          aria-label={listening ? "Stop listening" : "Speak your request"}
          className={`relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-surface ${listening ? "bg-danger" : "bg-rust"}`}
        >
          {listening && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-danger animate-ping opacity-40" />}
          <svg className="relative" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{listening ? "Listening… speak now" : "Speak your request"}</p>
          <p className="text-xs text-inkFaint truncate">{listening ? (transcript || "Say what you have and how much") : `Try ${current.hint}`}</p>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2.5">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            disabled={listening}
            onClick={() => setLang(l.code)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border disabled:opacity-50 ${
              lang === l.code ? "bg-rust text-surface border-rust" : "border-line text-inkSoft hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-danger mt-2.5">{error}</p>}

      <AnimatePresence>
        {parsed && !dismissed && !error && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 pt-3 border-t border-dashed border-line">
            <p className="text-[11px] text-inkFaint mb-1.5">I heard: “{transcript}”</p>
            {parsed.heard ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {parsed.items.map((it) => (
                    <span key={it.scrapType} className="rounded-full border border-rust/40 bg-rust/[0.06] px-3 py-1 text-xs font-semibold text-rust">
                      {SCRAP_TYPE_LABELS[it.scrapType] || it.scrapType}
                      {it.weight ? ` · ${it.weight} kg` : " · weight?"}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={apply} className="btn-primary !py-1.5 !px-3.5 text-xs">Fill the form</button>
                  <button type="button" onClick={start} className="text-xs font-semibold text-inkSoft hover:text-ink">Try again</button>
                </div>
                <p className="text-[11px] text-inkFaint mt-2">Check the types and weights in the form before submitting.</p>
              </>
            ) : (
              <p className="text-xs text-inkSoft">
                I couldn't pick out a scrap type. Say something like {current.hint}, or{" "}
                <button type="button" onClick={start} className="font-semibold text-rust hover:underline">try again</button>.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}