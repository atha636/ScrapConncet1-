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

async function makePending(requester, overrides = {}) {
  return Pickup.create({
    user: requester._id,
    scrapType: "metal",
    price: 100,
    status: "pending",
    location: { lat: 12.9, lng: 77.6 },
    ...overrides,
  });
}

describe("PATCH /api/pickup/collector/batch-accept", () => {
  test("requires auth", async () => {
    const res = await request(app).patch("/api/pickup/collector/batch-accept").send({ ids: [] });
    expect(res.status).toBe(401);
  });

  test("requires the collector role", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "batch-requester@example.com",
      password: "Password123",
      role: "user",
    });
    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ ids: [] });
    expect(res.status).toBe(403);
  });

  test("rejects an empty ids array", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "batch-empty@example.com",
      password: "Password123",
      role: "collector",
    });
    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });

  test("rejects a malformed id", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "batch-malformed@example.com",
      password: "Password123",
      role: "collector",
    });
    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: ["not-an-object-id"] });
    expect(res.status).toBe(400);
  });

  test("accepts every pickup in the batch when all are still pending", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "batch-all@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "batch-all-req@example.com",
      password: "Password123",
      role: "user",
    });
    const p1 = await makePending(requester);
    const p2 = await makePending(requester);
    const p3 = await makePending(requester);

    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: [p1._id, p2._id, p3._id] });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toHaveLength(3);
    expect(res.body.failed).toHaveLength(0);
    expect(res.body.accepted.every((p) => p.status === "accepted")).toBe(true);
    expect(res.body.accepted.every((p) => String(p.collector) === String(collector._id))).toBe(true);
  });

  test("partial success: an already-accepted pickup fails without blocking the rest", async () => {
    const collectorA = await User.create({
      name: "Collector A",
      email: "batch-partial-a@example.com",
      password: "Password123",
      role: "collector",
    });
    const collectorB = await User.create({
      name: "Collector B",
      email: "batch-partial-b@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "batch-partial-req@example.com",
      password: "Password123",
      role: "user",
    });

    const stillPending = await makePending(requester);
    const alreadyTaken = await makePending(requester, {
      status: "accepted",
      collector: collectorB._id,
    });

    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collectorA)}`)
      .send({ ids: [stillPending._id, alreadyTaken._id] });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toHaveLength(1);
    expect(String(res.body.accepted[0]._id)).toBe(String(stillPending._id));
    expect(res.body.failed).toHaveLength(1);
    expect(res.body.failed[0]).toEqual({ id: String(alreadyTaken._id), reason: "unavailable" });
  });

  test("reports not_found for a well-formed but nonexistent id", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "batch-notfound@example.com",
      password: "Password123",
      role: "collector",
    });
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: [fakeId] });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toHaveLength(0);
    expect(res.body.failed).toEqual([{ id: fakeId, reason: "not_found" }]);
  });

  test("a suspended collector cannot batch-accept anything", async () => {
    const collector = await User.create({
      name: "Suspended Collector",
      email: "batch-suspended@example.com",
      password: "Password123",
      role: "collector",
      collectorSuspended: true,
    });
    const requester = await User.create({
      name: "Requester",
      email: "batch-suspended-req@example.com",
      password: "Password123",
      role: "user",
    });
    const p1 = await makePending(requester);

    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: [p1._id] });

    expect(res.status).toBe(403);
    const reloaded = await Pickup.findById(p1._id);
    expect(reloaded.status).toBe("pending");
  });

  test("never lets the same pickup be accepted twice within one batch", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "batch-duplicate@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "batch-duplicate-req@example.com",
      password: "Password123",
      role: "user",
    });
    const p1 = await makePending(requester);

    const res = await request(app)
      .patch("/api/pickup/collector/batch-accept")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ ids: [p1._id, p1._id] });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toHaveLength(1);
    expect(res.body.failed).toHaveLength(1);
    expect(res.body.failed[0].reason).toBe("unavailable");
  });
});