const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Must be registered LAST, after all routes.
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, details } = err;

  // Translate common non-ApiError failures into clean responses instead of
  // leaking stack traces / driver internals to the client.
  if (!statusCode) {
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = err.message;
    } else if (err.code === 11000) {
      statusCode = 409;
      const field = Object.keys(err.keyPattern || {})[0];
      message = field === "email" ? "Email already registered" : "This already exists";
    } else {
      statusCode = 500;
      message = "Internal server error";
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};

module.exports = { notFound, errorHandler };