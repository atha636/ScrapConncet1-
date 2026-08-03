// Smallest amount a collector can request at once — stops someone from
// spamming ₹1 payout requests that cost more in admin overhead than they're
// worth processing.
const MIN_PAYOUT_AMOUNT = 100;

module.exports = { MIN_PAYOUT_AMOUNT };