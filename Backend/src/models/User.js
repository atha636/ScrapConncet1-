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
    // Confirmed no-shows against this collector — incremented by
    // pickupController.reportNoShow. Reaches NO_SHOW_SUSPENSION_THRESHOLD
    // (utils/reliabilityRules.js) and this feeds into the exact same
    // collectorSuspended flag a low rating does, so admin's existing
    // reinstateCollector flow (adminController.js) already handles
    // clearing a no-show-triggered suspension too — no parallel
    // suspend/unsuspend path needed for this.
    noShowCount: { type: Number, default: 0 },

    // Manual on/off switch, independent of the weekly schedule below — a
    // collector can be paused (going on leave, sick day) regardless of
    // whether they've set up a schedule at all, and a schedule doesn't
    // override an explicit pause. See utils/collectorAvailability.js for
    // how the two combine into a single "can accept jobs right now"
    // answer.
    collectorPaused: { type: Boolean, default: false },

    // Optional weekly working hours. `enabled: false` (the default) means
    // no schedule restriction applies at all — only the manual pause
    // above matters — so a collector who never visits this setting isn't
    // silently locked out. When enabled, a day with no entry in
    // `schedule` is treated as a day off.
    availabilitySchedule: {
      enabled: { type: Boolean, default: false },
      schedule: [
        {
          _id: false,
          // 0 = Sunday .. 6 = Saturday, matching JS Date#getDay() and
          // Intl.DateTimeFormat's own weekday numbering, so no reindexing
          // is needed when comparing against "today" later.
          day: { type: Number, min: 0, max: 6, required: true },
          // "HH:mm" 24-hour, checked in Asia/Kolkata local time (see
          // collectorAvailability.js) — this app is India-only (₹
          // pricing throughout), so a single fixed timezone is a
          // deliberate simplification rather than storing a per-user IANA
          // zone for a case that doesn't arise yet.
          start: { type: String, required: true },
          end: { type: String, required: true },
        },
      ],
    },

    // Snapshot of which badge ids (see utils/badges.js) this collector has
    // already been notified about — badges themselves are always computed
    // fresh from live stats, never stored, but this one small list is what
    // lets badgeNotifier tell "newly earned" apart from "already has it"
    // without recomputing history. Meaningless for role "user"/"admin",
    // same reasoning as collectorPreferences below.
    earnedBadgeIds: { type: [String], default: undefined },

    // Every user gets one, regardless of role — anyone can refer anyone
    // (see referralController.js). Generated lazily on first visit to the
    // referrals page rather than at registration for every account,
    // because backfilling this for every pre-existing user at once isn't
    // something a schema change alone can do — see
    // utils/referralCode.js's ensureReferralCode for where that
    // lazy-generation actually happens.
    referralCode: { type: String, unique: true, sparse: true },
    // Set once, at registration, if a valid code was provided — this is
    // what a Referral document's `referee` field points back to, but it's
    // kept here too as a cheap denormalized reference (e.g. for showing
    // "you were referred by X" on a profile) without a join.
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

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

    // Where a collector's approved payouts actually get sent — captured
    // once here as their standing default, then snapshotted onto each
    // PayoutRequest at the moment it's created (see PayoutRequest.js)
    // so a later change here never rewrites where money already in
    // flight for an older request was meant to go, and so admin reviewing
    // a request always sees exactly what the collector had on file when
    // they asked, not whatever's current now.
    //
    // `select: false` — unlike phone/name, this is genuinely sensitive
    // and has no reason to ride along on an ordinary User fetch (a
    // populated `pickup.collector`, a leaderboard row, a public profile).
    // Only the owning collector's own payout-details routes and the
    // one payout-request-creation path below ever need it, and both
    // explicitly `.select("+payoutDetails")` for that.
    payoutDetails: {
      type: {
        method: { type: String, enum: ["upi", "bank"] },
        upiId: { type: String, trim: true, maxlength: 80 },
        bankAccountNumber: { type: String, trim: true, maxlength: 30 },
        bankIfsc: { type: String, trim: true, uppercase: true, maxlength: 11 },
        bankAccountHolder: { type: String, trim: true, maxlength: 60 },
      },
      select: false,
      default: undefined,
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