const PushSubscription = require("../models/PushSubscription");
const asyncHandler = require("../utils/asyncHandler");
const { hasVapidConfig } = require("../config/webpush");

// GET /api/push/vapid-public-key
exports.getVapidPublicKey = asyncHandler(async (req, res) => {
  if (!hasVapidConfig) {
    return res.json({ enabled: false, publicKey: null });
  }
  res.json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
exports.subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;

  // Upsert on endpoint — the same browser subscribing twice (e.g. after a
  // page refresh re-registers) shouldn't create duplicate rows.
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user.id, endpoint, keys },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ success: true });
});

// POST /api/push/unsubscribe
exports.unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  await PushSubscription.deleteOne({ endpoint, user: req.user.id });
  res.json({ success: true });
});