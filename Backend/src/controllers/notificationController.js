const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ recipient: req.user.id }),
    Notification.countDocuments({ recipient: req.user.id, read: false }),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit), unreadCount });
});

// PATCH /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user.id,
  });
  if (!notification) throw new ApiError(404, "Notification not found");

  notification.read = true;
  await notification.save();
  res.json(notification);
});

// PATCH /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, read: false },
    { $set: { read: true } }
  );
  res.json({ success: true });
});