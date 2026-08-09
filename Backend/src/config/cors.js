/**
 * Parses CLIENT_ORIGIN into a list of allowed origins and returns a CORS
 * origin-check function shared by Express (app.js) and Socket.io (server.js).
 *
 * Handles the two gotchas that bite most CORS setups in production:
 *  - trailing slashes / stray whitespace on a pasted URL, which fail an
 *    exact string match even though the origin is "the same" (an Origin
 *    header itself never has a trailing slash, so a mismatch here is always
 *    the source misconfigured, not the browser).
 *  - needing more than one allowed origin (production Vercel URL, preview
 *    deployments, a custom domain later) — CLIENT_ORIGIN can be a single
 *    URL or a comma-separated list.
 *
 * Requests with no Origin header (curl, server-to-server, mobile apps,
 * health checks) are always allowed through — CORS is a browser-enforced
 * concept, so there's nothing to protect there.
 */
function parseAllowedOrigins(raw) {
  return (raw || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function buildCorsOriginCheck(raw, { logRejections = true } = {}) {
  const allowedOrigins = parseAllowedOrigins(raw);

  return (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalized = origin.replace(/\/+$/, "");
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    if (logRejections) {
      console.warn(`CORS: rejected origin "${origin}" — not in CLIENT_ORIGIN`);
    }
    return callback(new Error("Not allowed by CORS"));
  };
}

module.exports = { parseAllowedOrigins, buildCorsOriginCheck };