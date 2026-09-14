const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Rating = require("../src/models/Rating");
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

describe("GET /api/pickup/requester/me/reputation", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/pickup/requester/me/reputation");
    expect(res.status).toBe(401);
  });

  test("requires the user (requester) role", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "reputation-collector@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .get("/api/pickup/requester/me/reputation")
      .set("Authorization", `Bearer ${token(collector)}`);
    expect(res.status).toBe(403);
  });

  test("returns the requester's own stats, with no id field (never needs one)", async () => {
    const requester = await User.create({
      name: "Raj Verma",
      email: "reputation-raj@example.com",
      password: "Password123",
      role: "user",
      rating: 4.8,
      ratingCount: 12,
    });
    const collector = await User.create({
      name: "Collector",
      email: "reputation-collector2@example.com",
      password: "Password123",
      role: "collector",
    });
    await makePickup(requester, collector, { status: "completed" });

    const res = await request(app)
      .get("/api/pickup/requester/me/reputation")
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.completedCount).toBe(1);
    expect(res.body.rating).toBe(4.8);
    expect(res.body.id).toBeUndefined();
    expect(res.body.badges.map((b) => b.id)).toContain("top_rated");
  });

  test("only ever returns the caller's own data, never another requester's", async () => {
    const requesterA = await User.create({
      name: "Requester A",
      email: "reputation-a@example.com",
      password: "Password123",
      role: "user",
    });
    const requesterB = await User.create({
      name: "Requester B",
      email: "reputation-b@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "reputation-collector3@example.com",
      password: "Password123",
      role: "collector",
    });
    // Only B has any history.
    await makePickup(requesterB, collector, { status: "completed" });

    const res = await request(app)
      .get("/api/pickup/requester/me/reputation")
      .set("Authorization", `Bearer ${token(requesterA)}`);

    expect(res.status).toBe(200);
    expect(res.body.completedCount).toBe(0);
  });

  test("includes recent written reviews left by collectors", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "reputation-reviews@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector Name",
      email: "reputation-reviews-collector@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, { status: "completed" });
    await Rating.create({
      pickup: pickup._id,
      fromUser: collector._id,
      toUser: requester._id,
      score: 5,
      comment: "Easy pickup, very organized!",
    });

    const res = await request(app)
      .get("/api/pickup/requester/me/reputation")
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.recentReviews).toHaveLength(1);
    expect(res.body.recentReviews[0].fromName).toBe("Collector Name");
    expect(res.body.recentReviews[0].comment).toBe("Easy pickup, very organized!");
  });
});

describe("GET /api/pickup/requester/:id/profile now also includes reviews", () => {
  test("recentReviews field is present for the collector-facing view too", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "profile-reviews-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "profile-reviews-collector@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, { status: "completed" });
    await Rating.create({
      pickup: pickup._id,
      fromUser: collector._id,
      toUser: requester._id,
      score: 4,
      comment: "Smooth handoff.",
    });

    const res = await request(app)
      .get(`/api/pickup/requester/${requester._id}/profile`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body.recentReviews).toHaveLength(1);
    expect(res.body.recentReviews[0].comment).toBe("Smooth handoff.");
  });
});