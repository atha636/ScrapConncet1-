const Message = require("../models/Message");
const asyncHandler = require("../utils/asyncHandler");
const assertChatAccess = require("../utils/assertChatAccess");
const notifyUser = require("../utils/notifyUser");

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
exports.sendMessage = asyncHandler(async (req, res) => {
  const pickup = await assertChatAccess(req.params.id, req.user.id);

  const message = await Message.create({
    pickup: req.params.id,
    sender: req.user.id,
    text: req.body.text,
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
    text: `${populated.sender.name}: ${populated.text.slice(0, 60)}`,
    pickupId: pickup._id,
  });

  res.status(201).json(populated);
});