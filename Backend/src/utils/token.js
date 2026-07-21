const crypto = require("crypto");

/**
 * Generates a random token for email verification / password reset links.
 * Only the SHA-256 hash is ever stored in the database — the raw token
 * exists only in the email itself. This means a database leak alone can't
 * be used to forge valid verification/reset links.
 */
function generateToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

module.exports = { generateToken, hashToken };