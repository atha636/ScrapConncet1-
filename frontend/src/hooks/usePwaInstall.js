import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pwaInstallDismissed";
const DISMISS_DAYS = 14;

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return t && Date.now() - t < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
};

// canInstall: browser fired beforeinstallprompt (Android/desktop Chrome, Edge).
// showIosHint: iOS Safari has no prompt API, so we show Share -> Add to Home Screen steps.
export default function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed());

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
  }, [deferred]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    setHidden(true);
  }, []);

  return {
    canInstall: !hidden && !!deferred,
    showIosHint: !hidden && !deferred && isIos(),
    install,
    dismiss,
  };
}