import { useEffect, useState } from "react";
import usePwaInstall from "../../hooks/usePwaInstall";
import { useT } from "../../i18n/core";

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export default function PwaBanner() {
  const { t } = useT();
  const online = useOnline();
  const { canInstall, showIosHint, install, dismiss } = usePwaInstall();

  return (
    <>
      {!online && (
        <div role="status" className="bg-ink text-white text-sm text-center px-4 py-2">
          {t("pwa.offline")}
        </div>
      )}
      {online && (canInstall || showIosHint) && (
        <div className="bg-rust/10 border-b border-rust/20">
          <div className="max-w-5xl mx-auto px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">
              {canInstall
                ? t("pwa.install")
                : t("pwa.ios")}
            </span>
            <div className="flex items-center gap-4 shrink-0">
              {canInstall && (
                <button onClick={install} className="font-semibold text-rust hover:underline">
                  {t("pwa.installBtn")}
                </button>
              )}
              <button onClick={dismiss} className="text-inkFaint hover:text-ink" aria-label={t("pwa.dismiss")}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}