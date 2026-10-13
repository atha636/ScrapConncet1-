// Preferred pickup windows. Built in the requester's own timezone and sent to
// the server as absolute ISO times.
export const SLOT_WINDOWS = [
  { key: "morning", label: "Morning", from: 9, to: 12 },
  { key: "afternoon", label: "Afternoon", from: 12, to: 16 },
  { key: "evening", label: "Evening", from: 16, to: 19 },
];

const DAY_MS = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// The next `count` calendar days starting today, with a friendly label.
export function buildDays(now, count = 7) {
  return Array.from({ length: count }, (_, i) => {
    // Built from calendar fields so a daylight-saving shift can't land on the wrong day
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const label =
      i === 0 ? "Today" : i === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return { date, label };
  });
}

export function slotRange(day, win) {
  const y = day.date.getFullYear();
  const m = day.date.getMonth();
  const d = day.date.getDate();
  return { start: new Date(y, m, d, win.from, 0, 0), end: new Date(y, m, d, win.to, 0, 0) };
}

// A window can still be picked while at least 30 minutes of it remain.
export const isSlotAvailable = (day, win, now) => slotRange(day, win).end.getTime() > now.getTime() + 30 * 60000;

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

// "Today, 9:00 am – 12:00 pm"
export function formatSlot(slot) {
  if (!slot?.start || !slot?.end) return "";
  const start = new Date(slot.start);
  const today = startOfDay(new Date());
  const diffDays = Math.round((startOfDay(start) - today) / DAY_MS);
  const day =
    diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${fmtTime(start)} – ${fmtTime(slot.end)}`;
}