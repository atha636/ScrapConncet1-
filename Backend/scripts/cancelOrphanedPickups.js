// One-time cleanup: cancels any open (pending/accepted) pickup requests
// whose requester is already inactive/deleted, from before
// authController.deleteAccount started cancelling these itself. Without
// this, an old test/dummy account you already deleted can leave a "ghost"
// request sitting in the collector feed indefinitely.
//
// Usage: node scripts/cancelOrphanedPickups.js

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Pickup = require("../src/models/Pickup");
const User = require("../src/models/User");

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const inactiveUserIds = await User.find({ isActive: false }).distinct("_id");
  const orphaned = await Pickup.find({
    user: { $in: inactiveUserIds },
    status: { $in: ["pending", "accepted"] },
  });

  for (const pickup of orphaned) {
    pickup.pushHistory("cancelled", pickup.user);
    await pickup.save();
  }

  console.log(`Cancelled ${orphaned.length} orphaned pickup(s) from inactive/deleted accounts.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});