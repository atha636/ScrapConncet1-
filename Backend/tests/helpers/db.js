const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");


let mongod;

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

// Without this, mongodb-memory-server does a network call on *every single*
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || "7.0.14";

async function connect() {

  try {
    mongod = await MongoMemoryServer.create();
  } catch (err) {
    console.warn("MongoMemoryServer failed to start, retrying once:", err.message);
    mongod = await MongoMemoryServer.create();
  }
  await mongoose.connect(mongod.getUri());

  // mongoose.connect() resolves as soon as the connection is open — it does
  // NOT wait for each model's indexes (built in the background by default)
  // to finish. On a brand-new in-memory database that's a real race: a test
  // that runs a $geoNear query (which requires the 2dsphere index to
  // actually exist, not just be *building*) can fire before Pickup's index
  // is ready, failing with "requires a 2d or 2dsphere index, but none were
  // found" even though the schema defines one correctly. Model.init()
  // resolves once a given model's indexes are confirmed built, so waiting
  // on all of them here removes the race instead of leaving it to come up
  // as an intermittent failure.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

async function closeDatabase() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { connect, clearDatabase, closeDatabase };