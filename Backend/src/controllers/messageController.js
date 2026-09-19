const Message = require("../models/Message");
const asyncHandler = require("../utils/asyncHandler");
const assertChatAccess = require("../utils/assertChatAccess");
const notifyUser = require("../utils/notifyUser");
const ApiError = require("../utils/ApiError");

// GET /api/pickup/:id/messages
exports.getMessages = asyncHandler(async (req, res) => {
  await assertChatAccess(req.params.id, req.user.id);

  const messages = await Message.find({ pickup: req.params.id })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate("sender", "name role");

  res.json(messages);
});

// POST /api/pickup/:id/messages
//
// Accepts either a plain JSON body (text-only, the original behavior) or
// multipart form data with an "image" file field, via upload.single
// ("image") in messageRoutes.js — the same conditional-multer pattern
// pickupController's own photo-upload route already uses, so a
// text-only send is completely unaffected.
exports.sendMessage = asyncHandler(async (req, res) => {
  const pickup = await assertChatAccess(req.params.id, req.user.id);

  const text = req.body.text?.trim() || "";
  const image = req.file?.path || req.file?.secure_url || null;

  // Checked here, not in the zod schema, because req.file only exists
  // after multer has run — a schema validating req.body alone can't see
  // it. An empty POST (no text, no image) is the one shape this route
  // should actually reject.
  if (!text && !image) {
    throw new ApiError(400, "Message needs text or an image");
  }

  const message = await Message.create({
    pickup: req.params.id,
    sender: req.user.id,
    text,
    image,
  });

  const populated = await message.populate("sender", "name role");

  // Real-time delivery — only to sockets that joined this pickup's room,
  // never a global broadcast (chat is private to the two participants).
  req.io.to(`pickup:${req.params.id}`).emit("newMessage", populated);

  // Notify whichever participant did NOT send this message.
  const recipientId =
    String(pickup.user) === String(req.user.id) ? pickup.collector : pickup.user;

  await notifyUser(req.io, recipientId, {
    type: "new_message",
    text: image && !text ? `${populated.sender.name} sent a photo` : `${populated.sender.name}: ${text.slice(0, 60)}`,
    pickupId: pickup._id,
  });

  res.status(201).json(populated);
});

// PATCH /api/pickup/:id/messages/read
//
// Marks every message in this conversation sent by the *other* party as
// read — there's no per-message "mark this one read" concept in a
// two-person chat; opening the conversation reads everything in it at
// once, the same way every common chat app's read receipts work.
exports.markMessagesRead = asyncHandler(async (req, res) => {
  await assertChatAccess(req.params.id, req.user.id);

  const result = await Message.updateMany(
    { pickup: req.params.id, sender: { $ne: req.user.id }, readAt: null },
    { $set: { readAt: new Date() } }
  );

  // Only worth telling the other party's open chat window if something
  // actually changed — an empty read (nothing unread to begin with)
  // would just make their read-receipt ticks flicker for no reason.
  if (result.modifiedCount > 0) {
    req.io.to(`pickup:${req.params.id}`).emit("messagesRead", {
      pickupId: req.params.id,
      readBy: req.user.id,
      at: new Date(),
    });
  }

  res.json({ marked: result.modifiedCount });
});