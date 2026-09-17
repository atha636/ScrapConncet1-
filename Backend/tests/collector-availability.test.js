const { isCollectorAvailableNow } = require("../src/utils/collectorAvailability");

// A fixed reference instant: 2026-01-05 is a Monday. 10:30 IST is
// 05:00 UTC that same day.
const MONDAY_10_30_IST = new Date("2026-01-05T05:00:00.000Z");
// 20:30 IST the same Monday — outside a typical 09:00-18:00 window.
const MONDAY_20_30_IST = new Date("2026-01-05T15:00:00.000Z");
// Sunday, 2026-01-04, 10:30 IST.
const SUNDAY_10_30_IST = new Date("2026-01-04T05:00:00.000Z");

describe("isCollectorAvailableNow", () => {
  test("a collector with no availability settings at all is available", () => {
    expect(isCollectorAvailableNow({})).toBe(true);
  });

  test("manual pause always wins, even with no schedule set", () => {
    expect(isCollectorAvailableNow({ collectorPaused: true })).toBe(false);
  });

  test("manual pause wins even during working hours", () => {
    const user = {
      collectorPaused: true,
      availabilitySchedule: {
        enabled: true,
        schedule: [{ day: 1, start: "09:00", end: "18:00" }],
      },
    };
    expect(isCollectorAvailableNow(user, MONDAY_10_30_IST)).toBe(false);
  });

  test("a disabled schedule imposes no restriction, regardless of its contents", () => {
    const user = {
      availabilitySchedule: {
        enabled: false,
        schedule: [{ day: 1, start: "09:00", end: "18:00" }],
      },
    };
    expect(isCollectorAvailableNow(user, MONDAY_20_30_IST)).toBe(true);
  });

  test("available during today's working hours", () => {
    const user = {
      availabilitySchedule: {
        enabled: true,
        schedule: [{ day: 1, start: "09:00", end: "18:00" }],
      },
    };
    expect(isCollectorAvailableNow(user, MONDAY_10_30_IST)).toBe(true);
  });

  test("unavailable outside today's working hours", () => {
    const user = {
      availabilitySchedule: {
        enabled: true,
        schedule: [{ day: 1, start: "09:00", end: "18:00" }],
      },
    };
    expect(isCollectorAvailableNow(user, MONDAY_20_30_IST)).toBe(false);
  });

  test("a day with no schedule entry is treated as a day off", () => {
    const user = {
      availabilitySchedule: {
        enabled: true,
        // Only works Mondays — Sunday has no entry at all.
        schedule: [{ day: 1, start: "09:00", end: "18:00" }],
      },
    };
    expect(isCollectorAvailableNow(user, SUNDAY_10_30_IST)).toBe(false);
  });

  test("the end time is exclusive — exactly at closing counts as unavailable", () => {
    const user = {
      availabilitySchedule: {
        enabled: true,
        schedule: [{ day: 1, start: "09:00", end: "10:30" }],
      },
    };
    expect(isCollectorAvailableNow(user, MONDAY_10_30_IST)).toBe(false);
  });

  test("the start time is inclusive — exactly at opening counts as available", () => {
    const user = {
      availabilitySchedule: {
        enabled: true,
        schedule: [{ day: 1, start: "10:30", end: "18:00" }],
      },
    };
    expect(isCollectorAvailableNow(user, MONDAY_10_30_IST)).toBe(true);
  });

  test("an enabled schedule with an empty entries array means every day is a day off", () => {
    const user = { availabilitySchedule: { enabled: true, schedule: [] } };
    expect(isCollectorAvailableNow(user, MONDAY_10_30_IST)).toBe(false);
  });
});