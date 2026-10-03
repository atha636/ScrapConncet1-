const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("✅ MongoDB connected");

    // Seed the in-memory scrap-rate cache from the DB so pricing picks up
    // any admin-saved rates immediately on boot instead of the hardcoded
    // defaults.
    await require("../utils/pricing").refreshRateCache();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;