const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const cron = require("node-cron");

dotenv.config();

const createApp = require("./app");
const connectDB = require("./config/db");
const setupSocket = require("./socket/setupSocket");
const { escalateStalePickups } = require("./jobs/escalateStalePickups");
const { spawnRecurringPickups } = require("./jobs/spawnRecurringPickups");
const { buildCorsOriginCheck } = require("./config/cors");
const { hasCloudinaryConfig } = require("./config/cloudinary");

// Fail fast in production rather than silently falling back to whatever
// local/default storage multer-storage-cloudinary would otherwise use.
// A misconfigured Cloudinary env var should be caught at deploy time, not
// discovered later as a mysterious upload failure (or worse, images
// quietly landing somewhere unintended) once real users start uploading.
if (process.env.NODE_ENV === "production" && !hasCloudinaryConfig) {
  console.error(
    "❌ Refusing to start in production without Cloudinary configured " +
      "(CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)."
  );
  process.exit(1);
}

connectDB();

const app = createApp();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: buildCorsOriginCheck(CLIENT_ORIGIN) },
});
app.set("io", io);

setupSocket(io);

// Runs every 5 minutes, independent of any request — flags pickups that
// have sat pending too long as urgent so they surface higher in the
// collector feed instead of silently going stale.
cron.schedule("*/5 * * * *", () => {
  escalateStalePickups(io).catch((err) => console.error("Escalation job failed:", err));
});

// Every hour — weekly/biweekly/monthly schedules only need date-level
// precision, so there's no benefit to checking more often than this, and a
// due template never waits more than an hour past its scheduled date to
// actually spawn.
cron.schedule("0 * * * *", () => {
  spawnRecurringPickups(io).catch((err) => console.error("Recurring pickup job failed:", err));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});