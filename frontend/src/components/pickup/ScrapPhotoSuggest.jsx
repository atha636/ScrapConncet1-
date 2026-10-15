import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { suggestScrapTypes } from "../../utils/scrapClassifier";
import { SCRAP_TYPE_LABELS } from "../../utils/pickupItems";

/**
 * "Suggest scrap type from photo" — free, on-device. Parent should give it a
 * `key` tied to the photo so a new photo resets the result.
 */
export default function ScrapPhotoSuggest({ previewUrl, onUse }) {
  const [phase, setPhase] = useState("idle"); // idle | working | done | error
  const [results, setResults] = useState([]);
  const [used, setUsed] = useState({});

  const run = async () => {
    setPhase("working");
    try {
      setResults(await suggestScrapTypes(previewUrl));
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  const use = (type) => {
    onUse(type);
    setUsed((u) => ({ ...u, [type]: true }));
  };

  return (
    <div className="mt-3 rounded-ticket border border-line bg-surface p-3">
      {phase === "idle" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-inkSoft">Not sure what category it is? Let the app take a look.</p>
          <button type="button" onClick={run} className="btn-secondary !py-1.5 !px-3 text-xs shrink-0">
            Suggest type
          </button>
        </div>
      )}

      {phase === "working" && (
        <div>
          <p className="text-xs font-semibold text-ink mb-2">Looking at your photo…</p>
          <div className="h-1.5 rounded-full bg-line/60 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-rust animate-pulse" />
          </div>
          <p className="text-[11px] text-inkFaint mt-2">
            The first time, a small one-off model (a few MB) is downloaded. Your photo never leaves your phone for this.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-danger">Couldn't analyse the photo. Check your connection, or pick the type below.</p>
          <button type="button" onClick={run} className="btn-secondary !py-1.5 !px-3 text-xs shrink-0">Retry</button>
        </div>
      )}

      {phase === "done" && (
        <AnimatePresence>
          {results.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-inkSoft">
              Couldn't tell what this is — please choose the type below. A clearer, closer photo of one kind of scrap helps.
            </motion.p>
          ) : (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-semibold text-ink mb-2">
                {results[0].share >= 0.55 ? "This looks like:" : "This could be:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {results.map((r) => (
                  <button
                    key={r.scrapType}
                    type="button"
                    onClick={() => use(r.scrapType)}
                    disabled={used[r.scrapType]}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rust/40 bg-rust/[0.06] px-3 py-1.5 text-xs font-semibold text-rust hover:bg-rust hover:text-surface transition-colors disabled:opacity-60"
                  >
                    {used[r.scrapType] ? "✓" : "+"} {SCRAP_TYPE_LABELS[r.scrapType] || r.scrapType}
                    <span className="font-normal opacity-70">{Math.round(r.share * 100)}%</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-inkFaint mt-2">It's a suggestion — always check the type and weight below.</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}