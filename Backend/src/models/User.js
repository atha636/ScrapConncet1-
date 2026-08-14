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

    
    isVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false, default: null },
    verificationTokenExpires: { type: Date, select: false, default: null },

    // Password reset
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpires: { type: Date, select: false, default: null },

    // Bumped on password change/reset so previously issued JWTs stop being
    // accepted (see middleware/auth.js) — without this, changing your
    // password doesn't revoke a token someone else obtained, since JWTs are
    // otherwise valid until they naturally expire regardless of what
    // happens to the account afterward.
    sessionVersion: { type: Number, default: 0 },
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
    delete ret.sessionVersion;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);