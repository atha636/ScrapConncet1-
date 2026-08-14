const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) return next(new ApiError(401, "No token provided"));

  let decoded;
  try {
    // Pin the algorithm explicitly. Without this, jsonwebtoken will accept
    // whatever algorithm the token itself claims, which is what makes
    // algorithm-confusion attacks possible (e.g. a token crafted to declare
    // "none", or an asymmetric algorithm using the public key as the HMAC
    // secret). This server only ever signs with HS256, so verification
    // should only ever accept HS256.
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Session expired, please log in again" : "Invalid token";
    return next(new ApiError(401, message));
  }

  // Re-check current account state on every request instead of trusting
  // whatever was true at the moment the token was issued. A token can stay
  // valid for days — without this lookup, deactivating a user or bumping
  // their sessionVersion (see below) wouldn't take effect until the token
  // happened to expire on its own.
  const user = await User.findById(decoded.id).select("role isActive sessionVersion");
  if (!user) return next(new ApiError(401, "Invalid token"));
  if (!user.isActive) return next(new ApiError(403, "This account has been deactivated"));

  // sessionVersion is bumped whenever a password is changed or reset (see
  // authController). A token issued before that bump fails here even
  // though it hasn't expired yet — this is what makes a password change
  // actually revoke any other session using the old password, rather than
  // leaving it valid until it naturally expires up to 7 days later.
  if (decoded.sessionVersion !== user.sessionVersion) {
    return next(new ApiError(401, "Session expired, please log in again"));
  }

  req.user = { id: user._id.toString(), role: user.role };
  next();
});