import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import { useT } from "../../i18n/core";
import { readFlag, writeFlag } from "../../utils/onboardingStore";

/**
 * "Get started" checklist for a new account. The page works out which steps
 * are done from data it already has, so nothing here fetches anything. The
 * first unfinished step is highlighted with its one button. Hides itself
 * once everything is done, or when the user closes it, and remembers that.
 *
 * @param {object} props
 * @param {string} props.storageKey - unique per user + role
 * @param {string} props.title
 * @param {Array<{key:string,title:string,hint?:string,done:boolean,cta?:string,to?:string,onClick?:()=>void}>} props.steps
 */
export default function OnboardingChecklist({ storageKey, title, steps }) {
  const { t } = useT();
  const [hidden, setHidden] = useState(() => readFlag(`${storageKey}:dismissed`));

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (hidden || steps.length === 0) return null;

  const close = () => {
    writeFlag(`${storageKey}:dismissed`);
    setHidden(true);
  };

  const nextKey = steps.find((s) => !s.done)?.key;

  return (
    <Card className="p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="font-display font-semibold text-ink">{allDone ? t("onb.allSet") : title}</h2>
          <p className="text-xs text-inkFaint mt-0.5">
            {allDone ? t("onb.allDone") : t("onb.progress", { done: doneCount, total: steps.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="text-xs font-semibold text-inkFaint hover:text-ink shrink-0"
        >
          {allDone ? t("onb.close") : t("onb.hide")}
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-line/60 overflow-hidden my-3" aria-hidden="true">
        <div className="h-full rounded-full bg-rust transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const isNext = s.key === nextKey;
          return (
            <li key={s.key} className={`flex items-start gap-3 rounded-md ${isNext ? "bg-rust/[0.05] p-2.5 -mx-2.5" : ""}`}>
              <span
                className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  s.done ? "bg-emerald-600 text-white" : "border border-line text-inkFaint"
                }`}
                aria-hidden="true"
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${s.done ? "text-inkFaint line-through" : "font-semibold text-ink"}`}>
                  {s.title}
                  {s.done && <span className="sr-only"> {t("onb.doneSr")}</span>}
                </p>
                {!s.done && s.hint && <p className="text-xs text-inkSoft mt-0.5">{s.hint}</p>}
                {isNext && s.cta && (
                  <div className="mt-2">
                    {s.to ? (
                      <Link to={s.to} onClick={s.onClick} className="btn-primary !py-1.5 !px-3 text-xs inline-flex">{s.cta}</Link>
                    ) : (
                      <button type="button" onClick={s.onClick} className="btn-primary !py-1.5 !px-3 text-xs">{s.cta}</button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}