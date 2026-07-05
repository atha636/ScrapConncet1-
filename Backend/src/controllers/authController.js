const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, wantsToBeCollector } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashed,
    phone,
    role: wantsToBeCollector ? "collector" : "user",
  });

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