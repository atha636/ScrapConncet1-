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

async function makePickup(requester, collector, { status = "completed", cancelledBy } = {}) {
  const statusHistory = [{ status: "pending", changedBy: requester._id }];
  if (collector) statusHistory.push({ status: "accepted", changedBy: collector._id });
  if (status === "cancelled") {
    statusHistory.push({ status: "cancelled", changedBy: (cancelledBy || requester)._id });
  }
  return Pickup.create({
    user: requester._id,
    collector: collector ? collector._id : undefined,
    scrapType: "metal",
    price: 100,
    status,
    location: { lat: 12.9, lng: 77.6 },
    statusHistory,
  });
}

describe("GET /api/pickup/requester/:id/profile", () => {
  test("returns stats for a collector looking up a requester", async () => {
    const requester = await User.create({
      name: "Raj Verma",
      email: "raj@example.com",
      password: "Password123",
      role: "user",
      rating: 4.8,
      ratingCount: 12,
    });
    const collector = await User.create({
      name: "Collector",
      email: "collector-req-view@example.com",
      password: "Password123",
      role: "collector",
    });
    await makePickup(requester, collector, { status: "completed" });

    const res = await request(app)
      .get(`/api/pickup/requester/${requester._id}/profile`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Raj Verma");
    expect(res.body.completedCount).toBe(1);
    expect(res.body.badges.map((b) => b.id)).toContain("top_rated");
  });

  test("requires auth", async () => {
    const requester = await User.create({
      name: "Raj Verma",
      email: "raj2@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app).get(`/api/pickup/requester/${requester._id}/profile`);
    expect(res.status).toBe(401);
  });

  test("404s for a non-requester id", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "collector-only@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .get(`/api/pickup/requester/${collector._id}/profile`)
      .set("Authorization", `Bearer ${token(collector)}`);
    expect(res.status).toBe(404);
  });

  test("cancelling a still-pending request (no collector yet) doesn't count against completion rate", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "req-pending-cancel@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "collector-pending-cancel@example.com",
      password: "Password123",
      role: "collector",
    });

    // 3 completed, plus a pending request cancelled before any collector
    // ever touched it — that 4th one must be invisible to this stat.
    for (let i = 0; i < 3; i++) {
      await makePickup(requester, collector, { status: "completed" });
    }
    await Pickup.create({
      user: requester._id,
      scrapType: "metal",
      price: 50,
      status: "cancelled",
      location: { lat: 12.9, lng: 77.6 },
      statusHistory: [
        { status: "pending", changedBy: requester._id },
        { status: "cancelled", changedBy: requester._id },
      ],
    });

    const res = await request(app)
      .get(`/api/pickup/requester/${requester._id}/profile`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBe(1);
  });

  test("cancelling after a collector accepted does count against completion rate", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "req-post-accept-cancel@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "collector-post-accept-cancel@example.com",
      password: "Password123",
      role: "collector",
    });

    for (let i = 0; i < 3; i++) {
      await makePickup(requester, collector, { status: "completed" });
    }
    await makePickup(requester, collector, { status: "cancelled", cancelledBy: requester });

    const res = await request(app)
      .get(`/api/pickup/requester/${requester._id}/profile`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBeCloseTo(0.75);
  });

  test("never includes avgAcceptMinutes — not a requester-side concept", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "req-no-accept-time@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "collector-no-accept-time@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .get(`/api/pickup/requester/${requester._id}/profile`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.avgAcceptMinutes).toBeUndefined();
  });
});