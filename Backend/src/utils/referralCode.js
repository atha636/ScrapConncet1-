const crypto = require("crypto");

// Excludes visually ambiguous characters (0/O, 1/I/L) — this code gets
// read off a screen and typed back in by hand on the registration form,
// unlike the hex tokens in utils/token.js which only ever get copied via a
// link and never manually retyped.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

// Every user can refer people, but codes are generated lazily — the first
// time someone actually visits their referral page — rather than for every
// account at once, since a schema change alone can't backfill millions of
// existing rows and there's no reason to spend the (tiny but nonzero)
// uniqueness-collision-retry cost for users who never look at this
// feature. Idempotent: a user who already has a code just gets it back
// unchanged.
//
// Takes a full Mongoose document (not just an id) because the caller
// already has one in hand in every real call site (the referrals
// controller just authenticated this exact user) — fetching it again here
// would be a redundant query for no benefit.
async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;

  // Collisions are astronomically unlikely at 32^8 possibilities, but the
  // retry loop costs nothing and turns "unlikely" into "impossible in
  // practice" rather than a rare, confusing registration failure for some
  // unlucky future user.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      user.referralCode = code;
      await user.save();
      return code;
    } catch (err) {
      if (err.code !== 11000) throw err;
      // Duplicate key on referralCode — someone else generated the exact
      // same code first. Mongoose still holds the failed value in memory,
      // so clear it before looping to try again.
      user.referralCode = undefined;
    }
  }
  throw new Error("Could not generate a unique referral code after several attempts");
}

module.exports = { generateCode, ensureReferralCode };