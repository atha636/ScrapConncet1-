// How long a pickup can sit "accepted" with no progress before the
// requester is offered the option to report the collector as a no-show.
// Deliberately much longer than STALE_PICKUP_MINUTES (escalateStalePickups.js,
// which flags a pickup nobody has accepted yet) — a collector who just
// accepted 20 minutes ago is very plausibly still en route, not flaking.
const STALLED_PICKUP_MINUTES = parseInt(process.env.STALLED_PICKUP_MINUTES) || 60;

// How many confirmed no-shows suspend a collector — mirrors the existing
// rating-based gate in ratingController.js (MIN_RATINGS_FOR_GATE /
// SUSPENSION_THRESHOLD) and reuses the exact same User.collectorSuspended
// flag and admin reinstateCollector flow, rather than a parallel
// suspension mechanism. Low on purpose: unlike a bad rating (which can
// reflect a lot of things — price, communication, a late arrival), a true
// no-show is a specific, unambiguous failure to show up at all, so it
// doesn't need as many strikes to be meaningful.
const NO_SHOW_SUSPENSION_THRESHOLD = parseInt(process.env.NO_SHOW_SUSPENSION_THRESHOLD) || 3;

module.exports = { STALLED_PICKUP_MINUTES, NO_SHOW_SUSPENSION_THRESHOLD };