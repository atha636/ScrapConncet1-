const User = require("../models/User");
const notifyUser = require("../utils/notifyUser");
const { logAudit } = require("../utils/audit");

const REMINDER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Plain function (not wired into node-cron here) so it can be run on demand;
// the schedule lives in server.js.
//
// 1. Flips approved IDs past their expiry date to "expired" and tells the
//    collector to upload again. (utils/collectorVerification.js already
//    treats a lapsed ID as expired instantly — this job just makes the
//    stored status match, so status-based queries like "nearby collectors"
//    stay accurate.)
// 2. Sends one reminder REMINDER_DAYS before an ID lapses.
async function expireVerifications(io) {
  const now = new Date();

  const lapsed = await User.find({
    role: "collector",
    "collectorVerification.status": "approved",
    "collectorVerification.expiresAt": { $lte: now },
  });

  for (const user of lapsed) {
    user.collectorVerification.status = "expired";
    await user.save();

    await notifyUser(io, user._id, {
      type: "verification_update",
      text: "Your ID verification has expired. Upload your ID again to keep taking pickups.",
    });
    await logAudit(null, {
      action: "verification.expire",
      targetType: "collector",
      targetId: user._id,
      targetLabel: user.name,
    });
  }

  const soon = new Date(now.getTime() + REMINDER_DAYS * DAY_MS);
  const expiring = await User.find({
    role: "collector",
    "collectorVerification.status": "approved",
    "collectorVerification.expiresAt": { $gt: now, $lte: soon },
    "collectorVerification.expiryReminderSentAt": null, // also matches "never set"
  });

  for (const user of expiring) {
    const when = user.collectorVerification.expiresAt.toLocaleDateString("en-IN");
    await notifyUser(io, user._id, {
      type: "verification_update",
      text: `Your ID verification expires on ${when}. You'll need to upload your ID again after that.`,
    });
    user.collectorVerification.expiryReminderSentAt = now;
    await user.save();
  }

  return { expired: lapsed.length, reminded: expiring.length };
}

module.exports = { expireVerifications };