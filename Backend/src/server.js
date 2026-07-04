const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

dotenv.config();

const connectDB = require("./config/db");
const sanitize = require("./middleware/sanitize");
const setupSocket = require("./socket/setupSocket");
const { notFound, errorHandler } = require("./middleware/errorHandler");

connectDB();

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN },
});

setupSocket(io);

// --- Security & core middleware ---
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(sanitize);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Basic abuse protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});
app.use("/api/auth", authLimiter);

// Attach io to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// --- Routes ---
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/pickup", require("./routes/pickupRoutes"));
app.use("/api/pickup", require("./routes/messageRoutes"));

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});