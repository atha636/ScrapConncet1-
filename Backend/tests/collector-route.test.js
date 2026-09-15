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

async function makeJob(requester, collector, { status, lat, lng }) {
  return Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    price: 100,
    status,
    location: { lat, lng },
  });
}

describe("GET /api/pickup/collector/route", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/pickup/collector/route?lat=30.73&lng=76.77");
    expect(res.status).toBe(401);
  });

  test("requires the collector role", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "route-requester@example.com",
      password: "Password123",
      role: "user",
    });
    const res = await request(app)
      .get("/api/pickup/collector/route?lat=30.73&lng=76.77")
      .set("Authorization", `Bearer ${token(requester)}`);
    expect(res.status).toBe(403);
  });

  test("400s without usable coordinates", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "route-nocoords@example.com",
      password: "Password123",
      role: "collector",
    });
    const res = await request(app)
      .get("/api/pickup/collector/route")
      .set("Authorization", `Bearer ${token(collector)}`);
    expect(res.status).toBe(400);
  });

  test("returns an empty route when the collector has no active jobs", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "route-empty@example.com",
      password: "Password123",
      role: "collector",
    });
    const res = await request(app)
      .get("/api/pickup/collector/route?lat=30.73&lng=76.77")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.stops).toEqual([]);
    expect(res.body.totalKm).toBe(0);
    expect(res.body.savedKm).toBe(0);
  });

  test("includes only accepted/in_progress jobs, never completed or cancelled ones", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "route-statuses@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "route-statuses-req@example.com",
      password: "Password123",
      role: "user",
    });

    await makeJob(requester, collector, { status: "accepted", lat: 30.74, lng: 76.78 });
    await makeJob(requester, collector, { status: "in_progress", lat: 30.75, lng: 76.79 });
    await makeJob(requester, collector, { status: "completed", lat: 30.76, lng: 76.80 });
    await makeJob(requester, collector, { status: "cancelled", lat: 30.77, lng: 76.81 });

    const res = await request(app)
      .get("/api/pickup/collector/route?lat=30.73&lng=76.77")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.stops).toHaveLength(2);
    const statuses = res.body.stops.map((s) => s.pickup.status).sort();
    expect(statuses).toEqual(["accepted", "in_progress"]);
  });

  test("never includes another collector's jobs", async () => {
    const collectorA = await User.create({
      name: "Collector A",
      email: "route-a@example.com",
      password: "Password123",
      role: "collector",
    });
    const collectorB = await User.create({
      name: "Collector B",
      email: "route-b@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "route-ab-req@example.com",
      password: "Password123",
      role: "user",
    });

    await makeJob(requester, collectorB, { status: "accepted", lat: 30.74, lng: 76.78 });

    const res = await request(app)
      .get("/api/pickup/collector/route?lat=30.73&lng=76.77")
      .set("Authorization", `Bearer ${token(collectorA)}`);

    expect(res.status).toBe(200);
    expect(res.body.stops).toEqual([]);
  });

  test("numbers stops from 1 and reports a per-leg distance for each", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "route-legs@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "route-legs-req@example.com",
      password: "Password123",
      role: "user",
    });

    await makeJob(requester, collector, { status: "accepted", lat: 30.7333, lng: 76.84 });
    await makeJob(requester, collector, { status: "accepted", lat: 30.7333, lng: 76.79 });
    await makeJob(requester, collector, { status: "accepted", lat: 30.7333, lng: 76.82 });

    const res = await request(app)
      .get("/api/pickup/collector/route?lat=30.7333&lng=76.7794")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.stops.map((s) => s.order)).toEqual([1, 2, 3]);
    for (const stop of res.body.stops) {
      expect(typeof stop.legKm).toBe("number");
      expect(stop.legKm).toBeGreaterThanOrEqual(0);
    }
    // All three sit on one line heading east, so the optimal order is
    // simply nearest-to-furthest.
    const lngs = res.body.stops.map((s) => s.pickup.location.lng);
    expect(lngs).toEqual([76.79, 76.82, 76.84]);
  });

  test("populates the requester on each stop so the UI can show who it's for", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "route-populate@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Asha Singh",
      email: "route-populate-req@example.com",
      password: "Password123",
      role: "user",
    });
    await makeJob(requester, collector, { status: "accepted", lat: 30.74, lng: 76.78 });

    const res = await request(app)
      .get("/api/pickup/collector/route?lat=30.73&lng=76.77")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.body.stops[0].pickup.user.name).toBe("Asha Singh");
  });
});