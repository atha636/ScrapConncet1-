const jwt = require("jsonwebtoken");
const User = require("../models/User");
const assertChatAccess = require("../utils/assertChatAccess");
const assertCanShareLocation = require("../utils/assertCanShareLocation");

// Floor on how often one socket's location updates are actually relayed —
// a phone's GPS can fire far more often than any UI needs to redraw a pin,
// and this is the one place that matters for every collector at once, so
// it's worth capping cheaply here rather than trusting every client to
// self-throttle correctly.
const MIN_LOCATION_UPDATE_INTERVAL_MS = 3000;

// How often an already-connected socket gets re-checked against the
// database for revocation (deactivation, or a password change bumping
// sessionVersion — see middleware/auth.js for the REST equivalent of this
// same guarantee). Chosen as a balance between "revocation takes effect
// promptly" and "not hammering the DB for every open tab every few
// seconds" — a stale grace window of a few minutes is an acceptable
// trade-off for a socket connection, unlike a REST request which is
// re-checked on every single call.
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Loads the current isActive/sessionVersion for a user and returns whether
 * this socket's connection is still valid. Shared by the initial handshake
 * check and the periodic re-check so both apply the exact same rule.
 */
async function isStillValid(decoded) {
  const user = await User.findById(decoded.id).select("isActive sessionVersion");
  if (!user || !user.isActive) return false;

  const tokenSessionVersion = decoded.sessionVersion ?? 0;
  if (tokenSessionVersion !== user.sessionVersion) return false;

  return true;
}

/**
 * Wires up Socket.io:
 *  - every connection must present a valid JWT (same one used for REST auth)
 *  - that JWT's account is re-checked against the database at connect time,
 *    and periodically thereafter — mirroring middleware/auth.js's per-request
 *    guarantee that deactivating a user, or bumping sessionVersion via a
 *    password change, actually revokes access rather than leaving an
 *    already-open connection valid until it happens to disconnect on its
 *    own (network drop, tab refresh, etc.), which could otherwise be hours
 *    after the revocation.
 *  - a socket can only join a pickup's chat room if that user is genuinely
 *    the requester or the assigned collector for that pickup — otherwise
 *    anyone who guessed/saw a pickup ID could eavesdrop on a conversation.
 *  - only a pickup's assigned collector can broadcast live location for
 *    it, and only while the job is accepted/in_progress (see
 *    assertCanShareLocation.js) — relayed into that same pickup room, so
 *    a requester sees it exactly when they'd already be able to chat.
 *
 * newPickup/updatePickup (used by the dashboards) stay as global broadcasts,
 * emitted directly via `io.emit(...)` from the pickup controller — those are
 * public listings, not private data. Only chat is room-scoped.
 */
function setupSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return next(new Error("Invalid or expired token"));
    }

    if (!(await isStillValid(decoded))) {
      return next(new Error("This account is no longer authorized"));
    }

    socket.user = decoded;
    next();
  });

  io.on("connection", (socket) => {
    // Every authenticated socket automatically joins its own private room —
    // this is how notifications reach a user regardless of which page
    // they're on, without ever being a global broadcast.
    socket.join(`user:${socket.user.id}`);

    // The handshake check above only proves the account was valid at the
    // moment this connection was opened. A long-lived tab can easily stay
    // connected well past a later deactivation or password change, so
    // re-check on an interval and forcibly disconnect if the account is no
    // longer valid — closing the same gap the REST middleware closes on
    // every request, just on a coarser cadence appropriate for a socket.
    const revalidate = setInterval(async () => {
      try {
        if (!(await isStillValid(socket.user))) {
          socket.emit("chatError", "Your session is no longer valid. Please log in again.");
          socket.disconnect(true);
        }
      } catch {
        // A transient DB hiccup here shouldn't forcibly drop a legitimate
        // session — it'll simply be re-checked again next interval.
      }
    }, REVALIDATE_INTERVAL_MS);

    socket.on("joinPickup", async (pickupId) => {
      try {
        await assertChatAccess(pickupId, socket.user.id);
        socket.join(`pickup:${pickupId}`);
      } catch {
        socket.emit("chatError", "You don't have access to this conversation");
      }
    });

    socket.on("leavePickup", (pickupId) => {
      socket.leave(`pickup:${pickupId}`);
    });

    // Per-socket, not per-user — a collector with two tabs open shouldn't
    // have one tab's throttle window suppress the other's updates, and
    // keying by socket.id (rather than a Map that needs its own cleanup)
    // means this is naturally garbage-collected the moment the closure
    // itself goes away on disconnect.
    let lastLocationUpdateAt = 0;

    socket.on("collectorLocationUpdate", async ({ pickupId, lat, lng }) => {
      const now = Date.now();
      if (now - lastLocationUpdateAt < MIN_LOCATION_UPDATE_INTERVAL_MS) return;

      if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
        return;
      }

      try {
        await assertCanShareLocation(pickupId, socket.user.id);
        lastLocationUpdateAt = now;
        // Same room chat already uses (see joinPickup above) — a requester
        // who has the pickup detail view open is already in this room,
        // so live location "just works" alongside chat rather than
        // needing its own separate join step.
        io.to(`pickup:${pickupId}`).emit("collectorLocation", { pickupId, lat, lng, at: new Date() });
      } catch {
        socket.emit("locationError", "Can't share location for this pickup right now");
      }
    });

    // Typing indicators — ephemeral, no DB involved at all. Relayed with
    // socket.to() (excludes the sender) rather than io.to() (which
    // includes them) — unlike collectorLocation above, echoing this back
    // to the person doing the typing would be pointless, not just
    // redundant. Gated on socket.rooms rather than re-running
    // assertChatAccess on every keystroke: the only way a socket is in
    // this room at all is having already passed that check via joinPickup
    // above, so checking room membership here is just as correct and
    // avoids a DB round-trip per keystroke.
    socket.on("typing", (pickupId) => {
      if (!socket.rooms.has(`pickup:${pickupId}`)) return;
      socket.to(`pickup:${pickupId}`).emit("typing", { pickupId, userId: socket.user.id });
    });

    socket.on("stopTyping", (pickupId) => {
      if (!socket.rooms.has(`pickup:${pickupId}`)) return;
      socket.to(`pickup:${pickupId}`).emit("stopTyping", { pickupId, userId: socket.user.id });
    });

    socket.on("disconnect", () => {
      clearInterval(revalidate);
    });
  });
}

module.exports = setupSocket;