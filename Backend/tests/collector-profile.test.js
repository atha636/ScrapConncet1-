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

async function makeCompletedPickup(collector, requester, overrides = {}) {
  return Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    price: 100,
    status: "completed",
    location: { lat: 12.9, lng: 77.6 },
    ...overrides,
  });
}

// Builds a pickup with an explicit statusHistory timeline so accept-time
// and completion-rate math can be tested against known inputs, rather than
// relying on whatever Date.now() happens to be at test-run time.
async function makePickupWithHistory(collector, requester, { createdAt, acceptedAt, finalStatus, cancelledBy }) {
  const statusHistory = [{ status: "pending", changedAt: createdAt, changedBy: requester._id }];
  if (acceptedAt) statusHistory.push({ status: "accepted", changedAt: acceptedAt, changedBy: collector._id });
  if (finalStatus === "completed") {
    statusHistory.push({ status: "completed", changedAt: acceptedAt, changedBy: collector._id });
  }
  if (finalStatus === "cancelled") {
    statusHistory.push({ status: "cancelled", changedAt: acceptedAt, changedBy: cancelledBy._id });
  }

  return Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    price: 100,
    status: finalStatus === "cancelled" ? "cancelled" : finalStatus === "completed" ? "completed" : "accepted",
    location: { lat: 12.9, lng: 77.6 },
    createdAt,
    statusHistory,
  });
}

describe("GET /api/pickup/collector/:id/profile (authenticated)", () => {
  test("returns stats for a requester looking up their collector", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi@example.com",
      password: "Password123",
      role: "collector",
      rating: 4.5,
      ratingCount: 2,
    });
    const requester = await User.create({
      name: "Asha Singh",
      email: "asha@example.com",
      password: "Password123",
      role: "user",
    });

    const pickup = await makeCompletedPickup(collector, requester);
    await Rating.create({
      pickup: pickup._id,
      fromUser: requester._id,
      toUser: collector._id,
      score: 5,
      comment: "Great service, on time!",
    });

    const res = await request(app)
      .get(`/api/pickup/collector/${collector._id}/profile`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ravi Kumar");
    expect(res.body.completedCount).toBe(1);
    expect(res.body.suspended).toBe(false);
    expect(res.body.recentReviews).toHaveLength(1);
    expect(res.body.recentReviews[0].fromName).toBe("Asha Singh");
  });

  test("still shows a suspended collector's profile (requester needs to know)", async () => {
    const collector = await User.create({
      name: "Suspended Collector",
      email: "suspended@example.com",
      password: "Password123",
      role: "collector",
      collectorSuspended: true,
    });
    const requester = await User.create({
      name: "Requester",
      email: "requester@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app)
      .get(`/api/pickup/collector/${collector._id}/profile`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.suspended).toBe(true);
  });

  test("404s for an id that isn't a collector", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "requester2@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app)
      .get(`/api/pickup/collector/${requester._id}/profile`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(404);
  });

  test("requires auth", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi2@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/profile`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/pickup/collector/:id/profile/public (no auth)", () => {
  test("works with no Authorization header at all", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi3@example.com",
      password: "Password123",
      role: "collector",
      rating: 4.5,
      ratingCount: 2,
    });
    const requester = await User.create({
      name: "Asha Singh",
      email: "asha2@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await makeCompletedPickup(collector, requester);
    await Rating.create({
      pickup: pickup._id,
      fromUser: requester._id,
      toUser: collector._id,
      score: 5,
      comment: "Great service, on time!",
    });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/profile/public`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ravi Kumar");
    expect(res.body.completedCount).toBe(1);
  });

  test("trims a reviewer's name down to first name only", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi4@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Asha Singh",
      email: "asha3@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await makeCompletedPickup(collector, requester);
    await Rating.create({
      pickup: pickup._id,
      fromUser: requester._id,
      toUser: collector._id,
      score: 5,
      comment: "Great service!",
    });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/profile/public`);

    expect(res.status).toBe(200);
    expect(res.body.recentReviews[0].fromName).toBe("Asha");
  });

  test("never includes the `suspended` field", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi5@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/profile/public`);

    expect(res.status).toBe(200);
    expect(res.body.suspended).toBeUndefined();
  });

  test("404s for a suspended collector — a share link stops working once suspended", async () => {
    const collector = await User.create({
      name: "Suspended Collector",
      email: "suspended2@example.com",
      password: "Password123",
      role: "collector",
      collectorSuspended: true,
    });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/profile/public`);

    expect(res.status).toBe(404);
  });

  test("404s for a non-collector id", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "requester3@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app).get(`/api/pickup/collector/${requester._id}/profile/public`);
    expect(res.status).toBe(404);
  });

  test("404s for a well-formed but nonexistent id", async () => {
    const fakeId = "507f1f77bcf86cd799439011";
    const res = await request(app).get(`/api/pickup/collector/${fakeId}/profile/public`);
    expect(res.status).toBe(404);
  });
});

describe("reliability stats (avgAcceptMinutes / completionRate)", () => {
  test("withholds both stats below the minimum sample size", async () => {
    const collector = await User.create({
      name: "New Collector",
      email: "new-collector@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "req-a@example.com",
      password: "Password123",
      role: "user",
    });

    // Only one job on record, and it was cancelled — with the minimum
    // sample floor in place this must NOT read as a 0% completion rate.
    await makePickupWithHistory(collector, requester, {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      acceptedAt: new Date("2026-01-01T00:05:00Z"),
      finalStatus: "cancelled",
      cancelledBy: collector,
    });

    const res = await request(app)
      .get(`/api/pickup/collector/${collector._id}/profile`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.avgAcceptMinutes).toBeNull();
    expect(res.body.completionRate).toBeNull();
  });

  test("computes avgAcceptMinutes and completionRate once enough history exists", async () => {
    const collector = await User.create({
      name: "Established Collector",
      email: "established@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "req-b@example.com",
      password: "Password123",
      role: "user",
    });

    // 3 completed jobs, accepted 10 minutes after creation each time.
    for (let i = 0; i < 3; i++) {
      await makePickupWithHistory(collector, requester, {
        createdAt: new Date(`2026-01-0${i + 1}T00:00:00Z`),
        acceptedAt: new Date(`2026-01-0${i + 1}T00:10:00Z`),
        finalStatus: "completed",
      });
    }
    // 1 job the collector personally backed out of after accepting.
    await makePickupWithHistory(collector, requester, {
      createdAt: new Date("2026-01-04T00:00:00Z"),
      acceptedAt: new Date("2026-01-04T00:10:00Z"),
      finalStatus: "cancelled",
      cancelledBy: collector,
    });

    const res = await request(app)
      .get(`/api/pickup/collector/${collector._id}/profile`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.avgAcceptMinutes).toBe(10);
    expect(res.body.completionRate).toBeCloseTo(0.75);
  });

  test("a requester cancelling doesn't dent the collector's completion rate", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "collector-req-cancel@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "req-c@example.com",
      password: "Password123",
      role: "user",
    });

    for (let i = 0; i < 3; i++) {
      await makePickupWithHistory(collector, requester, {
        createdAt: new Date(`2026-02-0${i + 1}T00:00:00Z`),
        acceptedAt: new Date(`2026-02-0${i + 1}T00:05:00Z`),
        finalStatus: "completed",
      });
    }
    // Requester-initiated cancellation, not the collector's — should not
    // count against them at all.
    await makePickupWithHistory(collector, requester, {
      createdAt: new Date("2026-02-04T00:00:00Z"),
      acceptedAt: new Date("2026-02-04T00:05:00Z"),
      finalStatus: "cancelled",
      cancelledBy: requester,
    });

    const res = await request(app)
      .get(`/api/pickup/collector/${collector._id}/profile`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    // decidedCount = 3 completed + 0 collector-cancelled = 3, meets the
    // floor, and the rate is a clean 100% despite the 4th job existing.
    expect(res.body.completionRate).toBe(1);
  });
});