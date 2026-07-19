/**
 * Resets a user's password directly in the database. Use this when you're
 * locked out and there's no forgot-password flow yet.
 *
 *   node scripts/resetPassword.js you@example.com NewPassword123
 *
 * New password must be 8+ characters with at least one letter and one number
 * (same rule the app enforces everywhere else).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function main() {
  const [email, newPassword] = process.argv.slice(2);

  if (!email || !newPassword) {
    console.error("Usage: node scripts/resetPassword.js <email> <newPassword>");
    process.exit(1);
  }

  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    console.error("Password must be 8+ characters with at least one letter and one number.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  console.log(`✅ Password reset for ${user.email} (role: ${user.role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});