const webpush = require("web-push");

const hasVapidConfig = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;

if (hasVapidConfig) {
  webpush.setVapidDetails(
    // mailto: is required by the Web Push spec — it's how a push service
    // can contact you if your server is misbehaving, not a public-facing
    // support address.
    process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

module.exports = { webpush, hasVapidConfig };