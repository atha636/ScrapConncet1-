const ApiError = require("./ApiError");

// How long an approved ID stays valid before the collector has to upload it
// again. Configurable without a code change.
const VERIFICATION_VALID_DAYS = parseInt(process.env.VERIFICATION_VALID_DAYS) || 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const expiryFrom = (date = new Date()) => new Date(new Date(date).getTime() + VERIFICATION_VALID_DAYS * DAY_MS);

// The status that actually applies right now. An "approved" ID whose
// expiry date has passed counts as "expired" immediately, even in the gap
// before the hourly job (jobs/expireVerifications.js) flips the stored
// value. An approved ID with no expiry date (approved before expiry existed)
// never expires.
function effectiveStatus(v) {
  const status = v?.status || "not_submitted";
  if (status === "approved" && v?.expiresAt && new Date(v.expiresAt) <= new Date()) return "expired";
  return status;
}

// Throws unless this collector's ID is approved and unexpired. The
// `details.code` lets the frontend tell "not verified yet" apart from any
// other 403 and show the verification screen instead of a generic error.
function assertCollectorVerified(user) {
  const status = effectiveStatus(user?.collectorVerification);
  if (status !== "approved") {
    throw new ApiError(
      403,
      status === "expired"
        ? "Your ID verification has expired. Upload your ID again to keep taking pickups."
        : "Your ID must be verified by an admin before you can take pickups.",
      { code: "COLLECTOR_NOT_VERIFIED", status }
    );
  }
}

module.exports = { assertCollectorVerified, effectiveStatus, expiryFrom, VERIFICATION_VALID_DAYS };