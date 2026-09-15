// Flat bonus credited to a collector-role referrer once the person they
// referred completes their first-ever pickup (see referralActivation.js).
// A flat amount rather than a percentage of anything — there's no natural
// "percentage of what" here (the referee might be a requester whose
// pickup generated no collector earning at all), so a fixed rupee reward
// is the only value that means the same thing in every case.
const REFERRAL_BONUS_AMOUNT = 50;

module.exports = { REFERRAL_BONUS_AMOUNT };