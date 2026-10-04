const ApiError = require("./ApiError");

// Throws unless this collector's ID has been approved by an admin. The
// `details.code` lets the frontend tell "not verified yet" apart from any
// other 403 and show the verification screen instead of a generic error.
function assertCollectorVerified(user) {
  const status = user?.collectorVerification?.status || "not_submitted";
  if (status !== "approved") {
    throw new ApiError(403, "Your ID must be verified by an admin before you can take pickups.", {
      code: "COLLECTOR_NOT_VERIFIED",
      status,
    });
  }
}

module.exports = { assertCollectorVerified };