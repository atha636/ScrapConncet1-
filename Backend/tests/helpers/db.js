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

async function connect() {
  mongod = await MongoMemoryServer.create();
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