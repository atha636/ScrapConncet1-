const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const { generateToken: generateSecureToken, hashToken } = require("../utils/token");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/sendEmail");
const { googleClient, hasGoogleConfig } = require("../config/googleAuth");

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

  // A Google-only account has no password to compare against — bcrypt.compare
  // against a missing hash would throw, and even if it didn't, there's no
  // password this person could type to satisfy this endpoint. Point them at
  // the flow that actually works for their account instead of a confusing
  // "invalid password" for a password that was never set.
  if (!user.password) {
    throw new ApiError(401, "This account uses Google sign-in — use \"Continue with Google\" instead");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  const token = generateToken(user);
  user.password = undefined;
  res.json({ token, user });
});

// POST /api/auth/google
// Accepts a Google ID token (the "credential" from Google's Sign In With
// Google button/prompt) obtained on the frontend, verifies it directly
// against Google's public keys (never trusting anything the client claims
// about the token's contents), then either logs in an existing
// Google-linked account, links Google to an existing password account with
// the same email, or creates a brand new account.
exports.googleAuth = asyncHandler(async (req, res) => {
  if (!hasGoogleConfig) {
    throw new ApiError(503, "Google sign-in is not configured on this server");
  }

  const { credential, wantsToBeCollector, roleChosen } = req.body;

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Invalid Google sign-in — please try again");
  }

  // Google verifies the account's email ownership itself before issuing a
  // token, but a rare unverified-email edge case (e.g. some Workspace
  // configurations) shouldn't silently grant access to whatever inbox that
  // address belongs to.
  if (!payload.email_verified) {
    throw new ApiError(401, "Your Google account's email isn't verified");
  }

  let user = await User.findOne({ googleId: payload.sub });

  if (!user) {
    // No account linked to this specific Google identity yet — check for an
    // existing password-based account with the same email and link Google
    // to it, rather than creating a confusing second account for the same
    // person. Email match alone is a reasonable trust signal here because
    // Google has already verified this address belongs to whoever is
    // signing in right now.
    user = await User.findOne({ email: payload.email });

    if (user) {
      user.googleId = payload.sub;
      if (!user.isVerified) user.isVerified = true;
      await user.save();
    } else if (!roleChosen) {
      // A genuinely new person, and the caller hasn't told us their role
      // yet — this is the Login page's first attempt, which has no way to
      // know in advance whether this Google account is new. Rather than
      // silently defaulting everyone who signs in from Login to
      // "requester", tell the frontend to ask, and don't create anything
      // yet. The frontend resubmits with roleChosen: true once the person
      // picks — see GoogleSignInButton.jsx. (Register already knows the
      // role up front and always sends roleChosen: true on the first
      // call, so it never hits this branch.)
      return res.json({ needsRole: true });
    } else {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        role: wantsToBeCollector ? "collector" : "user",
        isVerified: true, // Google already verified this email address
      });
    }
  }

  if (!user.isActive) throw new ApiError(403, "This account has been deactivated");

  const token = generateToken(user);
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
  // Revokes every other token issued for this account (see middleware/auth.js)
  // — otherwise a token obtained before this change, by anyone, stays valid
  // under the old password's session until it naturally expires.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  // This request's own token is now invalid too (it was signed with the old
  // sessionVersion) — issue a fresh one so the current session keeps
  // working instead of getting silently logged out immediately after a
  // successful change.
  const token = generateToken(user);
  res.json({ success: true, token });
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
  // Same reasoning as changePassword — revoke whatever session(s) exist
  // under the old password. No fresh token is issued here since the
  // frontend redirects to /login after a successful reset anyway.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  res.json({ success: true });
});