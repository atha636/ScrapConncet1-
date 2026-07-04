const Message = require("../models/Message");
const asyncHandler = require("../utils/asyncHandler");
const assertChatAccess = require("../utils/assertChatAccess");

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
  await assertChatAccess(req.params.id, req.user.id);

  const message = await Message.create({
    pickup: req.params.id,
    sender: req.user.id,
    text: req.body.text,
  });

  const populated = await message.populate("sender", "name role");

  // Real-time delivery — only to sockets that joined this pickup's room,
  // never a global broadcast (chat is private to the two participants).
  req.io.to(`pickup:${req.params.id}`).emit("newMessage", populated);

  res.status(201).json(populated);
});