// Fixed timezone rather than a per-user IANA zone — this app is India-only
// (₹ pricing throughout the rest of the codebase), so a single hardcoded
// zone is a deliberate simplification, not an oversight.
const TIMEZONE = "Asia/Kolkata";

function nowInTimezone(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = weekdayMap[get("weekday")];

  // Intl can format midnight as "24:00" rather than "00:00" depending on
  // the runtime — normalized here so the "HH:mm" strings this compares
  // against (which always use "00:00") aren't silently mishandled at
  // exactly midnight.
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const minutes = Number(hour) * 60 + Number(get("minute"));

  return { day, minutes };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Whether a collector can accept a pickup right now. Two independent
 * gates: the manual pause always wins if set; otherwise, a schedule (if
 * the collector has turned one on) restricts acceptance to the hours
 * they've actually set for today, treating a day with no entry as a day
 * off.
 *
 * @param {{ collectorPaused?: boolean, availabilitySchedule?: { enabled?: boolean, schedule?: Array<{day: number, start: string, end: string}> } }} user
 * @param {Date} [now] - injectable for tests; defaults to the real current time
 */
function isCollectorAvailableNow(user, now = new Date()) {
  if (user.collectorPaused) return false;

  const availability = user.availabilitySchedule;
  if (!availability?.enabled) return true;

  const { day, minutes } = nowInTimezone(now);
  const todayEntry = (availability.schedule || []).find((s) => s.day === day);
  if (!todayEntry) return false;

  return minutes >= toMinutes(todayEntry.start) && minutes < toMinutes(todayEntry.end);
}

module.exports = { isCollectorAvailableNow, TIMEZONE };