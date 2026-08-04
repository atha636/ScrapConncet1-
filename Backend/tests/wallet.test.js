const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Transaction = require("../src/models/Transaction");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const app = createApp();

let collector, collectorToken, requester, pickup;

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  collector = await User.create({
    name: "Test Collector",
    email: "collector@example.com",
    password: "Password123",
    role: "collector",
  });
  collectorToken = jwt.sign({ id: collector._id, role: "collector" }, process.env.JWT_SECRET);

  requester = await User.create({
    name: "Test Requester",
    email: "requester@example.com",
    password: "Password123",
    role: "user",
  });

  pickup = await Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    location: { lat: 30.7333, lng: 76.7794, address: "Test address" },
    price: 250,
    status: "in_progress",
    statusHistory: [
      { status: "pending", changedBy: requester._id },
      { status: "accepted", changedBy: collector._id },
      { status: "in_progress", changedBy: collector._id },
    ],
  });
});

async function complete() {
  return request(app)
    .patch(`/api/pickup/${pickup._id}/status`)
    .set("Authorization", `Bearer ${collectorToken}`)
    .send({ status: "completed" });
}

describe("Completing a pickup credits the collector's ledger", () => {
  test("creates exactly one earning transaction for the pickup's price", async () => {
    const res = await complete();
    expect(res.status).toBe(200);

    const transactions = await Transaction.find({ collector: collector._id });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(250);
    expect(transactions[0].type).toBe("earning");
    expect(String(transactions[0].pickup)).toBe(String(pickup._id));
  });

  test("never credits twice for the same pickup, even if called again", async () => {
    await complete();

    // Force the pickup back to a completable state and retry the same
    // transition — simulates a retried request hitting the server twice.
    await Pickup.updateOne({ _id: pickup._id }, { status: "in_progress" });
    await complete();

    const transactions = await Transaction.find({ collector: collector._id });
    expect(transactions).toHaveLength(1); // unique index on (pickup, type) held
  });

  test("does not credit anything for a cancelled pickup", async () => {
    await request(app)
      .patch(`/api/pickup/${pickup._id}/status`)
      .set("Authorization", `Bearer ${collectorToken}`)
      .send({ status: "cancelled" });

    const transactions = await Transaction.find({ collector: collector._id });
    expect(transactions).toHaveLength(0);
  });
});

describe("GET /api/wallet/summary", () => {
  test("reflects zero earnings before any pickup is completed", async () => {
    const res = await request(app)
      .get("/api/wallet/summary")
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.allTime.totalEarned).toBe(0);
    expect(res.body.allTime.pickupsCompleted).toBe(0);
  });

  test("reflects the earning after a pickup is completed", async () => {
    await complete();

    const res = await request(app)
      .get("/api/wallet/summary")
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.body.allTime.totalEarned).toBe(250);
    expect(res.body.allTime.pickupsCompleted).toBe(1);
    expect(res.body.last7Days.totalEarned).toBe(250);
  });

  test("a non-collector cannot access another collector's wallet", async () => {
    const requesterToken = jwt.sign({ id: requester._id, role: "user" }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/wallet/summary")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
  });
});

describe("GET /api/wallet/transactions", () => {
  test("lists the collector's own transactions, newest first", async () => {
    await complete();

    const res = await request(app)
      .get("/api/wallet/transactions")
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(250);
    expect(res.body.data[0].pickup.scrapType).toBe("metal");
  });

  test("paginates when there are more transactions than the page limit", async () => {
    // Complete 3 separate pickups so there are 3 distinct earning entries
    for (let i = 0; i < 3; i++) {
      const p = await Pickup.create({
        user: requester._id,
        collector: collector._id,
        scrapType: "metal",
        estimatedWeightKg: 1,
        location: { lat: 30.7, lng: 76.7, address: "Test" },
        price: 100,
        status: "in_progress",
        statusHistory: [{ status: "in_progress", changedBy: collector._id }],
      });
      await request(app)
        .patch(`/api/pickup/${p._id}/status`)
        .set("Authorization", `Bearer ${collectorToken}`)
        .send({ status: "completed" });
    }

    const page1 = await request(app)
      .get("/api/wallet/transactions")
      .query({ limit: 2, page: 1 })
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.total).toBe(3);
    expect(page1.body.totalPages).toBe(2);

    const page2 = await request(app)
      .get("/api/wallet/transactions")
      .query({ limit: 2, page: 2 })
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(page2.body.data).toHaveLength(1);
    // No overlap between pages
    const page1Ids = page1.body.data.map((t) => t._id);
    const page2Ids = page2.body.data.map((t) => t._id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
  });
});

describe("GET /api/wallet/trend", () => {
  test("reports today's earning in the 30-day series", async () => {
    await complete();

    const res = await request(app)
      .get("/api/wallet/trend")
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.series).toHaveLength(30);

    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = res.body.series.find((d) => d.date === today);
    expect(todayEntry.earned).toBe(250);
    expect(todayEntry.count).toBe(1);
  });

  test("days with no earnings show as zero, not missing", async () => {
    const res = await request(app)
      .get("/api/wallet/trend")
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.body.series).toHaveLength(30);
    expect(res.body.series.every((d) => d.earned === 0)).toBe(true);
  });

  test("only a collector can access their earnings trend", async () => {
    const requesterToken = jwt.sign({ id: requester._id, role: "user" }, process.env.JWT_SECRET);
    const res = await request(app)
      .get("/api/wallet/trend")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
  });
});