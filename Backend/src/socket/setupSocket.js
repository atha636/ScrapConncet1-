const jwt = require("jsonwebtoken");
const assertChatAccess = require("../utils/assertChatAccess");

/**
 * Wires up Socket.io:
 *  - every connection must present a valid JWT (same one used for REST auth)
 *  - a socket can only join a pickup's chat room if that user is genuinely
 *    the requester or the assigned collector for that pickup — otherwise
 *    anyone who guessed/saw a pickup ID could eavesdrop on a conversation.
 *
 * newPickup/updatePickup (used by the dashboards) stay as global broadcasts,
 * emitted directly via `io.emit(...)` from the pickup controller — those are
 * public listings, not private data. Only chat is room-scoped.
 */
function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Every authenticated socket automatically joins its own private room —
    // this is how notifications reach a user regardless of which page
    // they're on, without ever being a global broadcast.
    socket.join(`user:${socket.user.id}`);

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
  });
}

module.exports = setupSocket;