const ApiError = require("../utils/ApiError");

// Usage: role("collector") or role("collector", "admin")
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, "Access denied"));
  }
  next();
};
