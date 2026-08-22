const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// A real MongoDB running in-memory, not a mock. Mocking Mongoose here would
// mean the tests no longer verify schema validation, unique indexes, or
// query behavior — the things most likely to actually break. This gives us
// a real DB with none of the cost/flakiness of a shared test database.
//
// Only imported by test files that need a database — pure unit tests (e.g.
// pricing.test.js) never pay the cost of spinning this up.
let mongod;

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

// Without this, mongodb-memory-server does a network call on *every single*
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || "7.0.14";

async function connect() {
  // A single retry covers the rare genuinely-transient case (a brief
  // network blip on first-ever binary download, a momentarily-busy CI
  // runner) without masking a real, consistently-failing setup — if it
  // fails twice in a row, that's a real problem worth seeing, not
  // something to keep silently retrying.
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err) {
    console.warn("MongoMemoryServer failed to start, retrying once:", err.message);
    mongod = await MongoMemoryServer.create();
  }
  await mongoose.connect(mongod.getUri());
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