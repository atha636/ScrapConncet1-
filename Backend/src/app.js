const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const sanitize = require("./middleware/sanitize");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";


const noopIo = {
  emit: () => {},
  to: () => ({ emit: () => {} }),
};

function createApp() {
  const app = express();
  app.set("io", noopIo);

  app.use(helmet());
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(sanitize);

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
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