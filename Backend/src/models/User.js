const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Not required for a Google-authenticated account — there's no password
    // to check, sign-in happens entirely through Google's own verification.
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 8,
      select: false,
    },
    // Google's stable per-account identifier ("sub" claim) — used to find
    // an existing Google-linked account on repeat sign-in. sparse so that
    // password-only accounts (which never set this) don't collide on the
    // unique index.
    googleId: { type: String, unique: true, sparse: true, select: false },
    role: { type: String, enum: ["user", "collector", "admin"], default: "user" },
    phone: { type: String, trim: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Set when the user deletes their own account (see authController.deleteAccount).
    // We soft-delete rather than remove the document outright because pickups,
    // messages, ratings, etc. still reference this user's id — wiping the row
    // would orphan that history for the other party involved. name/email/phone
    // are scrubbed at the same time so no personal data lingers.
    deletedAt: { type: Date, default: null },

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
    delete ret.googleId;
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