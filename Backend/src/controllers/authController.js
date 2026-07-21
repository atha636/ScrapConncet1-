const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const { generateToken: generateSecureToken, hashToken } = require("../utils/token");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/sendEmail");

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, wantsToBeCollector } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(password, 12);
  const { raw: verifyRaw, hash: verifyHash } = generateSecureToken();

  const user = await User.create({
    name,
    email,
    password: hashed,
    phone,
    role: wantsToBeCollector ? "collector" : "user",
    verificationTokenHash: verifyHash,
    verificationTokenExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
  });

  // Best-effort — registration succeeds even if the email fails to send
  // (e.g. Resend not configured yet). The user can request a resend later.
  await sendVerificationEmail(user, verifyRaw);

  const token = generateToken(user);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");

  if (!user.isActive) throw new ApiError(403, "This account has been deactivated");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  const token = generateToken(user);
  user.password = undefined;
  res.json({ token, user });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json(user);
});

// PATCH /api/auth/me
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  res.json(user);
});

// PATCH /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(401, "Current password is incorrect");

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ success: true });
});

// GET /api/auth/verify-email?token=...
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, "Verification token is required");

  const hash = hashToken(token);
  const user = await User.findOne({ verificationTokenHash: hash }).select(
    "+verificationTokenHash +verificationTokenExpires"
  );

  if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    throw new ApiError(400, "This verification link is invalid or has expired");
  }

  user.isVerified = true;
  user.verificationTokenHash = null;
  user.verificationTokenExpires = null;
  await user.save();

  res.json({ success: true });
});

// POST /api/auth/resend-verification  (auth required — resend for yourself)
exports.resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.isVerified) {
    return res.json({ success: true, alreadyVerified: true });
  }

  const { raw, hash } = generateSecureToken();
  user.verificationTokenHash = hash;
  user.verificationTokenExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await user.save();

  await sendVerificationEmail(user, raw);
  res.json({ success: true });
});

// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always respond the same way whether or not the email exists — this
  // prevents an attacker from using this endpoint to enumerate which
  // emails are registered.
  if (user) {
    const { raw, hash } = generateSecureToken();
    user.resetTokenHash = hash;
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();
    await sendPasswordResetEmail(user, raw);
  }

  res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
});

// POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const hash = hashToken(token);
  const user = await User.findOne({ resetTokenHash: hash }).select(
    "+resetTokenHash +resetTokenExpires"
  );

  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    throw new ApiError(400, "This reset link is invalid or has expired");
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await user.save();

  res.json({ success: true });
});