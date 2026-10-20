// Error monitoring (Sentry, free tier). Entirely optional: with no SENTRY_DSN
// set, nothing is loaded and every function here does nothing, so local dev
// and tests are unaffected. Errors only — no performance tracing, no session
// replay — which keeps it inside the free plan, and no personal data is sent.

let Sentry = null;

// Strip anything that could identify a person or carry a secret before an
// event leaves the server.
function scrub(event) {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }
  return event;
}

function initMonitoring() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  try {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.APP_VERSION || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: scrub,
    });
    return true;
  } catch (err) {
    console.error("Error monitoring failed to start:", err.message);
    Sentry = null;
    return false;
  }
}

// Must run after all routes and before the app's own error handler. Sentry
// only reports server errors (5xx / unexpected) — expected 4xx responses such
// as "not found" or validation failures are ignored.
function attachErrorHandler(app) {
  if (Sentry) Sentry.setupExpressErrorHandler(app);
}

// For failures that are caught and logged (background jobs, best-effort
// work) and would otherwise never reach Sentry.
function captureError(err, context) {
  if (!Sentry) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext("details", context);
    Sentry.captureException(err);
  });
}

function flushMonitoring(timeoutMs = 2000) {
  return Sentry ? Sentry.flush(timeoutMs) : Promise.resolve(true);
}

module.exports = { initMonitoring, attachErrorHandler, captureError, flushMonitoring };