// Error monitoring (Sentry free tier). Optional: with no VITE_SENTRY_DSN the
// SDK is never downloaded and every function here does nothing. Errors only —
// no performance tracing and no session replay — which keeps it inside the
// free plan, and no personal data (no name, email, IP or request bodies) is sent.

let sentry = null;
const pending = []; // errors caught before the SDK finished loading
const MAX_PENDING = 10;

// Links can carry secrets: password-reset and email-verify tokens in the query
// string, and the private trip-share token in the path.
export function scrubUrl(url) {
  if (typeof url !== "string") return url;
  return url.split("?")[0].split("#")[0].replace(/\/trip\/[^/]+/, "/trip/[redacted]");
}

function scrubEvent(event) {
  if (event.request?.url) event.request.url = scrubUrl(event.request.url);
  if (event.request) {
    delete event.request.cookies;
    delete event.request.query_string;
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }
  (event.breadcrumbs || []).forEach((b) => {
    if (b.data) {
      for (const k of ["url", "from", "to"]) if (b.data[k]) b.data[k] = scrubUrl(b.data[k]);
    }
  });
  return event;
}

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  // Loaded on demand so it never adds to the main bundle.
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        // Things that aren't bugs in our code.
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "ResizeObserver loop completed with undelivered notifications",
          "Network Error",
          "Failed to fetch",
          "Load failed",
          "NetworkError when attempting to fetch resource",
        ],
        denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i],
        beforeBreadcrumb: (b) => (b.category === "console" ? null : b),
        beforeSend: scrubEvent,
      });
      sentry = Sentry;
      pending.splice(0).forEach(({ error, extra }) => Sentry.captureException(error, { extra }));
    })
    .catch(() => {
      /* monitoring must never break the app */
    });
}

// For errors we catch ourselves (the app-wide error boundary). Uncaught errors
// and unhandled promise rejections are picked up by the SDK on its own.
export function captureError(error, extra) {
  if (sentry) {
    sentry.captureException(error, { extra });
  } else if (import.meta.env.VITE_SENTRY_DSN && pending.length < MAX_PENDING) {
    pending.push({ error, extra });
  }
}