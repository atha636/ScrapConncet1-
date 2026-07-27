// A collector needs at least this many ratings before the gate can act —
// otherwise one unlucky first rating (e.g. a 1-star from a bad-faith
// requester) would suspend someone with no track record yet.
const MIN_RATINGS_FOR_GATE = 5;

// Below this running average (once MIN_RATINGS_FOR_GATE is met), a
// collector is auto-suspended from accepting new pickups.
const SUSPENSION_THRESHOLD = 3.5;

module.exports = { MIN_RATINGS_FOR_GATE, SUSPENSION_THRESHOLD };