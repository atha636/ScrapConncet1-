const request = require("supertest");
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

async function makeReview(collector, requester, { score = 5, comment = "Great job!", createdAt } = {}) {
  const pickup = await Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    price: 100,
    status: "completed",
    location: { lat: 12.9, lng: 77.6 },
  });
  return Rating.create({
    pickup: pickup._id,
    fromUser: requester._id,
    toUser: collector._id,
    score,
    comment,
    ...(createdAt ? { createdAt } : {}),
  });
}

describe("GET /api/pickup/collector/:id/reviews (no auth)", () => {
  test("works with no Authorization header at all", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi-reviews@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Asha Singh",
      email: "asha-reviews@example.com",
      password: "Password123",
      role: "user",
    });
    await makeReview(collector, requester);

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  test("trims reviewer names to first name only", async () => {
    const collector = await User.create({
      name: "Ravi Kumar",
      email: "ravi-reviews2@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Asha Singh",
      email: "asha-reviews2@example.com",
      password: "Password123",
      role: "user",
    });
    await makeReview(collector, requester);

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/reviews`);

    expect(res.body.data[0].fromName).toBe("Asha");
  });

  test("paginates, newest first", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "collector-paginate@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "requester-paginate@example.com",
      password: "Password123",
      role: "user",
    });

    for (let i = 0; i < 15; i++) {
      await makeReview(collector, requester, {
        comment: `Review number ${i}`,
        createdAt: new Date(2026, 0, i + 1),
      });
    }

    const page1 = await request(app).get(`/api/pickup/collector/${collector._id}/reviews?page=1&limit=10`);
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.total).toBe(15);
    expect(page1.body.totalPages).toBe(2);
    // Newest first — the last one created (i=14) should be first.
    expect(page1.body.data[0].comment).toBe("Review number 14");

    const page2 = await request(app).get(`/api/pickup/collector/${collector._id}/reviews?page=2&limit=10`);
    expect(page2.body.data).toHaveLength(5);
  });

  test("excludes ratings with no written comment", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "collector-nocomment@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "requester-nocomment@example.com",
      password: "Password123",
      role: "user",
    });
    await makeReview(collector, requester, { comment: "" });
    await makeReview(collector, requester, { comment: "A real review" });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/reviews`);

    expect(res.body.total).toBe(1);
    expect(res.body.data[0].comment).toBe("A real review");
  });

  test("404s for a suspended collector, matching the public profile endpoint", async () => {
    const collector = await User.create({
      name: "Suspended Collector",
      email: "suspended-reviews@example.com",
      password: "Password123",
      role: "collector",
      collectorSuspended: true,
    });

    const res = await request(app).get(`/api/pickup/collector/${collector._id}/reviews`);
    expect(res.status).toBe(404);
  });

  test("404s for a non-collector id", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "requester-only-reviews@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app).get(`/api/pickup/collector/${requester._id}/reviews`);
    expect(res.status).toBe(404);
  });
});