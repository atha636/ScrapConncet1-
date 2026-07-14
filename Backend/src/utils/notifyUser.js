const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const { webpush, hasVapidConfig } = require("../config/webpush");

/**
 * Creates a notification, pushes it live to the recipient's private socket
 * room (for the in-app bell), AND sends a real browser push notification to
 * every device that user has subscribed on — so it reaches them even if the
 * tab isn't open. Push delivery is best-effort: a failure here never blocks
 * the in-app notification, which is the more critical path.
 */
async function notifyUser(io, recipientId, { type, text, pickupId = null }) {
  const notification = await Notification.create({
    recipient: recipientId,
    type,
    text,
    pickup: pickupId,
  });

  io.to(`user:${recipientId}`).emit("notification", notification);

  if (hasVapidConfig) {
    sendPushToUser(recipientId, { title: "ScrapConnect", body: text, pickupId }).catch((err) =>
      console.error("Push delivery failed:", err.message)
    );
  }

  return notification;
}

async function sendPushToUser(userId, payload) {
  const subscriptions = await PushSubscription.find({ user: userId });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
      } catch (err) {
        // 404/410 = the browser unsubscribed or the subscription expired on
        // its end — clean up our stale copy rather than retrying forever.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          throw err;
        }
      }
    })
  );
}

module.exports = notifyUser;