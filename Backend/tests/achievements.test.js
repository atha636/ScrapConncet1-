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

describe("GET /api/pickup/collector/achievements", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/pickup/collector/achievements");
    expect(res.status).toBe(401);
  });

  test("requires the collector role", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "achievements-requester@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app)
      .get("/api/pickup/collector/achievements")
      .set("Authorization", `Bearer ${token(requester)}`);
    expect(res.status).toBe(403);
  });

  test("returns the full 8-entry catalog, all locked, for a brand-new collector", async () => {
    const collector = await User.create({
      name: "New Collector",
      email: "achievements-new@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .get("/api/pickup/collector/achievements")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    expect(res.body.every((b) => b.earned === false)).toBe(true);
  });

  test("only ever returns the requesting collector's own progress, never another's", async () => {
    const collectorA = await User.create({
      name: "Collector A",
      email: "achievements-a@example.com",
      password: "Password123",
      role: "collector",
    });
    const collectorB = await User.create({
      name: "Collector B",
      email: "achievements-b@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "achievements-req@example.com",
      password: "Password123",
      role: "user",
    });
    await Pickup.create({
      user: requester._id,
      collector: collectorB._id,
      scrapType: "metal",
      price: 100,
      status: "completed",
      location: { lat: 12.9, lng: 77.6 },
    });

    // Collector A has no completions of their own — B's completed pickup
    // must not leak into A's progress just because there's no :id param
    // to get wrong here.
    const res = await request(app)
      .get("/api/pickup/collector/achievements")
      .set("Authorization", `Bearer ${token(collectorA)}`);

    const firstPickup = res.body.find((b) => b.id === "pickups_1");
    expect(firstPickup.earned).toBe(false);
    expect(firstPickup.current).toBe(0);
  });

  test("reflects real progress once some pickups are completed", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "achievements-progress@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "achievements-progress-req@example.com",
      password: "Password123",
      role: "user",
    });
    for (let i = 0; i < 5; i++) {
      await Pickup.create({
        user: requester._id,
        collector: collector._id,
        scrapType: "metal",
        price: 100,
        status: "completed",
        location: { lat: 12.9, lng: 77.6 },
      });
    }

    const res = await request(app)
      .get("/api/pickup/collector/achievements")
      .set("Authorization", `Bearer ${token(collector)}`);

    const byId = Object.fromEntries(res.body.map((b) => [b.id, b]));
    expect(byId.pickups_1.earned).toBe(true);
    expect(byId.pickups_10.earned).toBe(false);
    expect(byId.pickups_10.current).toBe(5);
    expect(byId.pickups_10.target).toBe(10);
  });
});