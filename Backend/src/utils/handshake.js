const crypto = require("crypto");

// Wrong-code attempts allowed before the collector is locked out, and how
// long the lockout lasts. Env-tunable like the other pickup rules.
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
const OTP_LOCK_MINUTES = parseInt(process.env.OTP_LOCK_MINUTES) || 15;

// The start-of-pickup code is DERIVED, not stored: an HMAC of the pickup id
// and the assigned collector id, reduced to 4 digits. That means
//   - nothing secret sits in the database or in the "updatePickup" socket
//     payload (which is broadcast to every client), and
//   - if the pickup is ever reassigned to a different collector, the code
//     changes automatically, because the collector id is part of the input.
// The requester's own endpoints recompute it and show it; nobody else does.
function deriveOtp(pickupId, collectorId) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`pickup-otp:${pickupId}:${collectorId}`)
    .digest();
  return String(digest.readUInt32BE(0) % 10000).padStart(4, "0");
}

function otpMatches(expected, given) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(given ?? "").trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { deriveOtp, otpMatches, OTP_MAX_ATTEMPTS, OTP_LOCK_MINUTES };