const Notification = require("../models/Notification");

/**
 * Creates a notification and pushes it live to the recipient's private
 * socket room (`user:{id}`) — set up in setupSocket.js, joined automatically
 * on connection. Never broadcast globally; a notification is only ever
 * relevant to the one person it's for.
 */
async function notifyUser(io, recipientId, { type, text, pickupId = null }) {
  const notification = await Notification.create({
    recipient: recipientId,
    type,
    text,
    pickup: pickupId,
  });

  io.to(`user:${recipientId}`).emit("notification", notification);
  return notification;
}

module.exports = notifyUser;