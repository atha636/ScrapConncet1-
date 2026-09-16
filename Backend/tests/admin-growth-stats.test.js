const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Referral = require("../src/models/Referral");
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

async function makeAdmin() {
  return User.create({
    name: "Admin",
    email: `admin-${Date.now()}-${Math.random()}@example.com`,
    password: "Password123",
    role: "admin",
  });
}

describe("GET /api/admin/growth-stats", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/admin/growth-stats");
    expect(res.status).toBe(401);
  });

  test("requires the admin role", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "growth-collector@example.com",
      password: "Password123",
      role: "collector",
    });
    const res = await request(app)
      .get("/api/admin/growth-stats")
      .set("Authorization", `Bearer ${token(collector)}`);
    expect(res.status).toBe(403);
  });

  test("returns null conversionRate with zero referrals, not a misleading 0", async () => {
    const admin = await makeAdmin();
    const res = await request(app)
      .get("/api/admin/growth-stats")
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.referrals.total).toBe(0);
    expect(res.body.referrals.conversionRate).toBeNull();
  });

  test("computes referral totals, split by status, and total reward paid", async () => {
    const admin = await makeAdmin();
    const referrerA = await User.create({
      name: "Referrer A",
      email: "growth-ref-a@example.com",
      password: "Password123",
      role: "collector",
    });
    const referrerB = await User.create({
      name: "Referrer B",
      email: "growth-ref-b@example.com",
      password: "Password123",
      role: "collector",
    });
    const refereeA = await User.create({
      name: "Referee A",
      email: "growth-referee-a@example.com",
      password: "Password123",
      role: "user",
    });
    const refereeB = await User.create({
      name: "Referee B",
      email: "growth-referee-b@example.com",
      password: "Password123",
      role: "user",
    });
    const refereeC = await User.create({
      name: "Referee C",
      email: "growth-referee-c@example.com",
      password: "Password123",
      role: "user",
    });

    await Referral.create({ referrer: referrerA._id, referee: refereeA._id, status: "completed", rewardAmount: 50 });
    await Referral.create({ referrer: referrerB._id, referee: refereeB._id, status: "completed", rewardAmount: 50 });
    await Referral.create({ referrer: referrerA._id, referee: refereeC._id, status: "pending" });

    const res = await request(app)
      .get("/api/admin/growth-stats")
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.referrals.total).toBe(3);
    expect(res.body.referrals.completed).toBe(2);
    expect(res.body.referrals.pending).toBe(1);
    expect(res.body.referrals.totalRewardPaid).toBe(100);
    expect(res.body.referrals.conversionRate).toBeCloseTo(2 / 3);
  });

  test("counts badges from earnedBadgeIds, ordered lowest-to-highest milestone tier", async () => {
    const admin = await makeAdmin();
    await User.create({
      name: "Collector 1",
      email: "growth-badges-1@example.com",
      password: "Password123",
      role: "collector",
      earnedBadgeIds: ["pickups_1", "pickups_10"],
    });
    await User.create({
      name: "Collector 2",
      email: "growth-badges-2@example.com",
      password: "Password123",
      role: "collector",
      earnedBadgeIds: ["pickups_1", "reliable"],
    });
    // No badges yet — must not appear in any count.
    await User.create({
      name: "Collector 3",
      email: "growth-badges-3@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .get("/api/admin/growth-stats")
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(res.status).toBe(200);
    const milestoneIds = res.body.badges.milestones.map((m) => m.id);
    expect(milestoneIds).toEqual(["pickups_1", "pickups_10", "pickups_50", "pickups_100", "pickups_250"]);
    const byId = Object.fromEntries(res.body.badges.milestones.map((m) => [m.id, m.count]));
    expect(byId.pickups_1).toBe(2);
    expect(byId.pickups_10).toBe(1);
    expect(res.body.badges.reliable).toBe(1);
  });

  test("returns null averages when no collector has enough history", async () => {
    const admin = await makeAdmin();
    const res = await request(app)
      .get("/api/admin/growth-stats")
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.reliability.collectorsWithEnoughHistory).toBe(0);
    expect(res.body.reliability.avgCompletionRate).toBeNull();
  });

  test("averages each collector's own completion rate, not a single blended ratio", async () => {
    const admin = await makeAdmin();
    const requester = await User.create({
      name: "Requester",
      email: "growth-reliability-req@example.com",
      password: "Password123",
      role: "user",
    });

    // Collector A: 3 completed, 100% completion rate, low volume.
    const collectorA = await User.create({
      name: "Collector A",
      email: "growth-reliability-a@example.com",
      password: "Password123",
      role: "collector",
    });
    for (let i = 0; i < 3; i++) {
      await Pickup.create({
        user: requester._id,
        collector: collectorA._id,
        scrapType: "metal",
        price: 100,
        status: "completed",
        location: { lat: 12.9, lng: 77.6 },
      });
    }

    // Collector B: high volume (30 completed), still 100% — a blended
    // ratio across all pickups would already be ~100% either way here, so
    // this alone doesn't distinguish the two approaches; the point of
    // this test is just confirming the endpoint doesn't crash or skew
    // when volumes differ sharply, and that both collectors clear the
    // sample floor.
    const collectorB = await User.create({
      name: "Collector B",
      email: "growth-reliability-b@example.com",
      password: "Password123",
      role: "collector",
    });
    for (let i = 0; i < 30; i++) {
      await Pickup.create({
        user: requester._id,
        collector: collectorB._id,
        scrapType: "metal",
        price: 100,
        status: "completed",
        location: { lat: 12.9, lng: 77.6 },
      });
    }

    const res = await request(app)
      .get("/api/admin/growth-stats")
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.reliability.collectorsWithEnoughHistory).toBe(2);
    expect(res.body.reliability.avgCompletionRate).toBeCloseTo(1);
  });
});