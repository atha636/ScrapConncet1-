const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const cron = require("node-cron");

dotenv.config();

const createApp = require("./app");
const connectDB = require("./config/db");
const setupSocket = require("./socket/setupSocket");
const { escalateStalePickups } = require("./jobs/escalateStalePickups");
const { escalateStalledPickups } = require("./jobs/escalateStalledPickups");
const { spawnRecurringPickups, remindUpcomingRecurring } = require("./jobs/spawnRecurringPickups");
const { notifyBatchableClusters } = require("./jobs/notifyBatchableClusters");
const { expireStaleNegotiations } = require("./jobs/expireStaleNegotiations");
const { autoConfirmSettlements } = require("./jobs/autoConfirmSettlements");
const { sendWeeklyDigest } = require("./jobs/sendWeeklyDigest");
const { expireVerifications } = require("./jobs/expireVerifications");
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

// Same cadence as the job above, but the opposite end of a pickup's
// life — that one flags a pickup nobody has accepted yet; this one flags
// one a collector accepted but never started, so the requester can
// report a no-show (see pickupController.reportNoShow).
cron.schedule("*/5 * * * *", () => {
  escalateStalledPickups(io).catch((err) => console.error("Stalled-pickup escalation job failed:", err));
});

// Every hour — weekly/biweekly/monthly schedules only need date-level
// precision, so there's no benefit to checking more often than this, and a
// due template never waits more than an hour past its scheduled date to
// actually spawn.
cron.schedule("0 * * * *", () => {
  spawnRecurringPickups(io).catch((err) => console.error("Recurring pickup job failed:", err));
});

// Offset half an hour from the spawn job above, hourly — a reminder
// window is 24h wide, so hourly is plenty of resolution, and running on
// the half hour means a template that's about to spawn is never reminded
// and spawned in the same minute.
cron.schedule("30 * * * *", () => {
  remindUpcomingRecurring(io).catch((err) => console.error("Recurring reminder job failed:", err));
});

// Every 10 minutes — checks recently-active, currently-available
// collectors for a batchable cluster of pending pickups near their last
// known position and pushes an alert if one has formed. Same cadence
// reasoning as the escalation jobs above: frequent enough that a fresh
// cluster reaches a collector while it's still worth driving for, not so
// frequent that it re-scans collectors who haven't moved or whose area
// hasn't changed.
cron.schedule("*/10 * * * *", () => {
  notifyBatchableClusters(io).catch((err) => console.error("Batch-alert job failed:", err));
});

// Every 30 minutes — reverts a negotiation nobody has moved on in
// STALE_NEGOTIATION_HOURS back to "declined" so the pickup isn't locked
// away from every other collector by one abandoned back-and-forth. Same
// cadence reasoning as the batch-alert job: frequent enough that a stale
// negotiation clears out reasonably promptly, far below the cost of
// scanning the (typically small) set of currently-negotiating pickups.
// Auto-confirms weight settlements the requester never answered.
cron.schedule("*/30 * * * *", () => {
  autoConfirmSettlements(io).catch((err) => console.error("Settlement auto-confirm job failed:", err));
});

cron.schedule("*/30 * * * *", () => {
  expireStaleNegotiations(io).catch((err) => console.error("Negotiation-expiry job failed:", err));
});

// Hourly — expires collector IDs past their validity date and sends the
// one-time "expires soon" reminder (see jobs/expireVerifications.js).
cron.schedule("15 * * * *", () => {
  expireVerifications(io).catch((err) => console.error("ID expiry job failed:", err));
});

// Every Monday at 9am IST — node-cron's own `timezone` option, not a
// manual day-of-week check inside the job, so this stays correct
// regardless of what timezone the server process itself runs in. See
// sendWeeklyDigest's own comment for why this is a real activity summary
// and not a scheduled marketing touch.
cron.schedule(
  "0 9 * * 1",
  () => {
    sendWeeklyDigest().catch((err) => console.error("Weekly digest job failed:", err));
  },
  { timezone: "Asia/Kolkata" }
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});