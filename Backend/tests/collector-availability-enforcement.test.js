const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const app = createApp();

beforeAll(async () => {
  await connect();
}, 60000);

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

function token(user) {
  return jwt.sign(
    { id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 },
    process.env.JWT_SECRET
  );
}

describe("GET /api/pickup/collector/availability", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/pickup/collector/availability");
    expect(res.status).toBe(401);
  });

  test("defaults to available, unpaused, no schedule", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-default@example.com",
      password: "Password123",
      role: "collector",
    });
    const res = await request(app)
      .get("/api/pickup/collector/availability")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.paused).toBe(false);
    expect(res.body.scheduleEnabled).toBe(false);
    expect(res.body.isAvailableNow).toBe(true);
  });
});

describe("PATCH /api/pickup/collector/availability", () => {
  test("toggling paused takes effect immediately", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-toggle@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .patch("/api/pickup/collector/availability")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ paused: true });

    expect(res.status).toBe(200);
    expect(res.body.paused).toBe(true);
    expect(res.body.isAvailableNow).toBe(false);
  });

  test("rejects an end time that isn't after the start time", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-bad-range@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .patch("/api/pickup/collector/availability")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ schedule: [{ day: 1, start: "18:00", end: "09:00" }] });

    expect(res.status).toBe(400);
  });

  test("rejects a schedule with the same day listed twice", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-dup-day@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .patch("/api/pickup/collector/availability")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({
        schedule: [
          { day: 1, start: "09:00", end: "12:00" },
          { day: 1, start: "13:00", end: "18:00" },
        ],
      });

    expect(res.status).toBe(400);
  });

  test("updating only paused leaves an existing schedule untouched", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-partial-update@example.com",
      password: "Password123",
      role: "collector",
    });

    await request(app)
      .patch("/api/pickup/collector/availability")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ scheduleEnabled: true, schedule: [{ day: 1, start: "09:00", end: "18:00" }] });

    const res = await request(app)
      .patch("/api/pickup/collector/availability")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ paused: true });

    expect(res.status).toBe(200);
    expect(res.body.paused).toBe(true);
    expect(res.body.scheduleEnabled).toBe(true);
    expect(res.body.schedule).toHaveLength(1);
  });
});

describe("accepting pickups while unavailable", () => {
  test("acceptPickup is blocked while manually paused", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-accept-paused@example.com",
      password: "Password123",
      role: "collector",
      collectorPaused: true,
    });
    const requester = await User.create({
      name: "Requester",
      email: "avail-accept-paused-req@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await Pickup.create({
      user: requester._id,
      scrapType: "metal",
      price: 100,
      status: "pending",
      location: { lat: 12.9, lng: 77.6 },
    });

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/accept`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(403);
    const reloaded = await Pickup.findById(pickup._id);
    expect(reloaded.status).toBe("pending");
  });

  test("acceptPickup succeeds once resumed", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-accept-resumed@example.com",
      password: "Password123",
      role: "collector",
      collectorPaused: false,
    });
    const requester = await User.create({
      name: "Requester",
      email: "avail-accept-resumed-req@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await Pickup.create({
      user: requester._id,
      scrapType: "metal",
      price: 100,
      status: "pending",
      location: { lat: 12.9, lng: 77.6 },
    });

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/accept`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
  });

  test("batchAcceptPickups is blocked while paused, before touching any pickup", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "avail-batch-paused@example.com",
      password: "Password123",
      role: "collector",
      collectorPaused: true,
    });
    const requester = await User.create({
      name: "Requester",
      email: "avail-batch-paused-req@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await Pickup.create({
      user: requester._id,
      scrapType: "metal",
      price: 100,
      status: "pending",
      location: { lat: 12.9, lng: 77.6 },
    });

    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: [pickup._id] });

    expect(res.status).toBe(403);
    const reloaded = await Pickup.findById(pickup._id);
    expect(reloaded.status).toBe("pending");
  });

  test("an unscheduled day blocks acceptance even without a manual pause", async () => {
    // day 2 = Tuesday only; the check runs against the real current time,
    // so pick whichever single weekday is guaranteed to never be today.
    const notToday = (new Date().getDay() + 3) % 7;
    const collector = await User.create({
      name: "Collector",
      email: "avail-schedule-block@example.com",
      password: "Password123",
      role: "collector",
      availabilitySchedule: { enabled: true, schedule: [{ day: notToday, start: "00:00", end: "23:59" }] },
    });
    const requester = await User.create({
      name: "Requester",
      email: "avail-schedule-block-req@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await Pickup.create({
      user: requester._id,
      scrapType: "metal",
      price: 100,
      status: "pending",
      location: { lat: 12.9, lng: 77.6 },
    });

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/accept`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(403);
  });
});