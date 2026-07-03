const ApiError = require("../utils/ApiError");

// Wraps a Zod schema into Express middleware. Validates req.body (default)
// or another req property, and replaces it with the parsed/coerced result.
const validate = (schema, property = "body") => (req, res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return next(new ApiError(400, "Validation failed", details));
  }

  req[property] = result.data;
  next();
};

module.exports = validate;
