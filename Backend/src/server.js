const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const cron = require("node-cron");

dotenv.config();

const createApp = require("./app");
const connectDB = require("./config/db");
const setupSocket = require("./socket/setupSocket");
const { escalateStalePickups } = require("./jobs/escalateStalePickups");

connectDB();

const app = createApp();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN },
});
app.set("io", io);

setupSocket(io);

// Runs every 5 minutes, independent of any request — flags pickups that
// have sat pending too long as urgent so they surface higher in the
// collector feed instead of silently going stale.
cron.schedule("*/5 * * * *", () => {
  escalateStalePickups(io).catch((err) => console.error("Escalation job failed:", err));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});