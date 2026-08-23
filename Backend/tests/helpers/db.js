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