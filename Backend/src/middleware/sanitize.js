// Replaces express-mongo-sanitize, which is incompatible with Express 5:
// it tries to reassign req.query, but Express 5 made req.query a getter-only
// accessor, so the package throws "Cannot set property query of
// #<IncomingMessage> which has only a getter" on every request.
//
// This does the same job — stripping Mongo operator keys ($gt, $where, etc.)
// and dotted keys that could be used for NoSQL injection — but only mutates
// req.body and req.params, which are safe plain objects, not req.query.

const isPlainObject = (val) =>
  Object.prototype.toString.call(val) === "[object Object]";

function sanitize(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(sanitize);
    return obj;
  }
  if (!isPlainObject(obj)) return obj;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }
    sanitize(obj[key]);
  }
  return obj;
}

module.exports = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  // req.query is intentionally left alone (Express 5 getter-only) — routes
  // in this app validate query params explicitly via Zod/parseInt anyway.
  next();
};