const jwt = require("jsonwebtoken");

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d", algorithm: "HS256" }
  );

module.exports = generateToken;