const mongoose = require("mongoose");
const { SCRAP_TYPES } = require("./Pickup");

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

    // Lets a collector narrow which live "new pickup" events actually
    // reach them (toast/list) to scrap types they actually want and a
    // radius they're willing to travel, instead of every pending pickup
    // nationwide. Meaningless for role "user"/"admin", so left unset
    // (undefined) rather than given defaults for those roles — the
    // frontend only ever reads/writes this for a collector account.
    // scrapTypes: null/empty array means "no type filter" (all types).
    collectorPreferences: {
      scrapTypes: { type: [String], enum: SCRAP_TYPES, default: undefined },
      // Capped at 100, matching pickupController.getAvailable's own
      // Math.min(100, ...) clamp on the radiusKm query param — storing a
      // preference above what the endpoint will ever actually honor would
      // just be a silently-lying setting.
      radiusKm: { type: Number, min: 1, max: 100, default: undefined },
    },

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