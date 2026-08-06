const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["user", "collector", "admin"], default: "user" },
    phone: { type: String, trim: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // Collector-specific fields
    collectorSuspended: { type: Boolean, default: false },
    collectorSuspendedAt: { type: Date, default: null },

    // Email verification — soft gate: unverified users can still log in and
    // use the app, but see a reminder banner. Not enforced as a hard block
    // by default (see authController for where that decision lives).
    isVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false, default: null },
    verificationTokenExpires: { type: Date, select: false, default: null },

    // Password reset
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpires: { type: Date, select: false, default: null },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.verificationTokenHash;
    delete ret.verificationTokenExpires;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);