
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/makeAdmin.js <email>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  user.role = "admin";
  await user.save();
  console.log(`✅ ${user.email} is now an admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});