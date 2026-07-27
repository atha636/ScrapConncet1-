// One-time backfill: derives Pickup.geo from the existing location.lat/lng
// on documents created before the geo field existed. New documents get this
// automatically via the pre-save hook in models/Pickup.js — this script is
// only needed once, for data that predates that hook.
//
// Usage: node scripts/backfillGeo.js

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Pickup = require("../src/models/Pickup");

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const cursor = Pickup.find({ geo: { $exists: false } }).cursor();
  let updated = 0;

  for await (const pickup of cursor) {
    if (typeof pickup.location?.lat === "number" && typeof pickup.location?.lng === "number") {
      pickup.geo = { type: "Point", coordinates: [pickup.location.lng, pickup.location.lat] };
      await pickup.save();
      updated++;
    }
  }

  console.log(`Backfilled geo field on ${updated} pickup(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});