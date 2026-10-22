import { useEffect, useState } from "react";
import usePwaInstall from "../../hooks/usePwaInstall";

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
  const online = useOnline();
  const { canInstall, showIosHint, install, dismiss } = usePwaInstall();

  return (
    <>
      {!online && (
        <div role="status" className="bg-ink text-white text-sm text-center px-4 py-2">
          You're offline. Showing what's already loaded; new requests will fail until you're back online.
        </div>
      )}
      {online && (canInstall || showIosHint) && (
        <div className="bg-rust/10 border-b border-rust/20">
          <div className="max-w-5xl mx-auto px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">
              {canInstall
                ? "Install ScrapConnect for quick access from your home screen."
                : "To install: tap the Share icon, then “Add to Home Screen”."}
            </span>
            <div className="flex items-center gap-4 shrink-0">
              {canInstall && (
                <button onClick={install} className="font-semibold text-rust hover:underline">
                  Install
                </button>
              )}
              <button onClick={dismiss} className="text-inkFaint hover:text-ink" aria-label="Dismiss">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}