const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const sanitize = require("./middleware/sanitize");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { buildCorsOriginCheck } = require("./config/cors");

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";


const noopIo = {
  emit: () => {},
  to: () => ({ emit: () => {} }),
};

function createApp() {
  const app = express();
  app.set("io", noopIo);

  // Railway (and most PaaS hosts) sit the app behind a single reverse
  // proxy, so incoming requests arrive with the real client IP in
  // X-Forwarded-For rather than as the actual TCP peer. Without this,
  // express-rate-limit keys every request off the proxy's own IP instead
  // of the real client — meaning the whole limiter effectively becomes one
  // shared bucket for all traffic, not per-visitor. `1` means "trust
  // exactly one hop", matching a single reverse proxy — not a wildcard
  // trust of arbitrary forwarded headers.
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(cors({ origin: buildCorsOriginCheck(CLIENT_ORIGIN), credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(sanitize);

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // General ceiling across the whole API, on top of the stricter authLimiter
  // below — auth previously had the only rate limit in the app, leaving
  // every other endpoint (pickup creation, messages, etc.) with no abuse
  // protection at all. This is deliberately generous (routine use should
  // never come close to it) — it's a backstop against scripted hammering,
  // not a throttle on normal usage.
  //
  // Skipped entirely in tests: a single test file can easily register/log
  // in dozens of times in a few seconds (each `it` often creates its own
  // user), which isn't "abuse" — it's just how the suite runs. Applying the
  // same limiter there means test N+1 starts getting real 429s once test N
  // has already used up the window, failing tests that have nothing to do
  // with rate limiting at all.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message: "Too many requests, please slow down" },
  });
  app.use("/api", apiLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message: "Too many attempts, please try again later" },
  });
  app.use("/api/auth", authLimiter);

  app.use((req, res, next) => {
    req.io = req.app.get("io");
    next();
  });

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/pickup", require("./routes/pickupRoutes"));
  app.use("/api/pickup", require("./routes/messageRoutes"));
  app.use("/api/pickup", require("./routes/ratingRoutes"));
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/push", require("./routes/pushRoutes"));
  app.use("/api/export", require("./routes/exportRoutes"));
  app.use("/api/wallet", require("./routes/walletRoutes"));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;