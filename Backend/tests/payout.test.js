const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Transaction = require("../src/models/Transaction");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { MIN_PAYOUT_AMOUNT } = require("../src/utils/payoutRules");

const app = createApp();

let collector, admin, requester;

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

function token(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
}

// Credits the collector with `amount` by completing a pickup, exactly the
// way the real earning flow does it — not a shortcut Transaction.create,
// so these tests exercise the same path a real payout balance depends on.
async function creditEarning(amount) {
  const pickup = await Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    location: { lat: 30.7, lng: 76.7, address: "Test" },
    price: amount,
    status: "in_progress",
    statusHistory: [{ status: "in_progress", changedBy: collector._id }],
  });

  await request(app)
    .patch(`/api/pickup/${pickup._id}/status`)
    .set("Authorization", `Bearer ${token(collector)}`)
    .send({ status: "completed" });
}

beforeEach(async () => {
  collector = await User.create({
    name: "Collector",
    email: "collector@example.com",
    password: "Password123",
    role: "collector",
  });
  admin = await User.create({
    name: "Admin",
    email: "admin@example.com",
    password: "Password123",
    role: "admin",
  });
  requester = await User.create({
    name: "Requester",
    email: "requester@example.com",
    password: "Password123",
    role: "user",
  });
});

describe("POST /api/wallet/payout", () => {
  test("rejects an amount below the minimum", async () => {
    await creditEarning(1000);
    const res = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: MIN_PAYOUT_AMOUNT - 1 });

    expect(res.status).toBe(400);
  });

  test("rejects a request larger than the available balance", async () => {
    await creditEarning(200);
    const res = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    expect(res.status).toBe(400);
  });

  test("creates a pending request when within balance", async () => {
    await creditEarning(1000);
    const res = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.amount).toBe(500);
  });

  test("blocks a second request while one is already pending", async () => {
    await creditEarning(1000);
    await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 300 });

    const res = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 300 });

    expect(res.status).toBe(409);
  });

  test("a pending request reserves its amount against the available balance", async () => {
    await creditEarning(1000);
    await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 700 }); // pending, reserves 700 of the 1000

    const summary = await request(app)
      .get("/api/wallet/summary")
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(summary.body.balance.available).toBe(300); // 1000 earned - 700 pending
  });

  test("only a collector can request a payout", async () => {
    const res = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ amount: 500 });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/payouts/:id/approve", () => {
  test("creates a payout Transaction and updates status", async () => {
    await creditEarning(1000);
    const reqRes = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 600 });

    const approveRes = await request(app)
      .patch(`/api/admin/payouts/${reqRes.body._id}/approve`)
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("approved");

    const txs = await Transaction.find({ collector: collector._id, type: "payout" });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(600);

    const summary = await request(app)
      .get("/api/wallet/summary")
      .set("Authorization", `Bearer ${token(collector)}`);
    expect(summary.body.balance.available).toBe(400); // 1000 - 600 paid out
  });

  test("cannot approve the same request twice", async () => {
    await creditEarning(1000);
    const reqRes = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    await request(app)
      .patch(`/api/admin/payouts/${reqRes.body._id}/approve`)
      .set("Authorization", `Bearer ${token(admin)}`);

    const secondAttempt = await request(app)
      .patch(`/api/admin/payouts/${reqRes.body._id}/approve`)
      .set("Authorization", `Bearer ${token(admin)}`);

    expect(secondAttempt.status).toBe(400); // already processed, status is no longer pending

    const txs = await Transaction.find({ collector: collector._id, type: "payout" });
    expect(txs).toHaveLength(1); // never double-debited
  });

  test("only an admin can approve", async () => {
    await creditEarning(1000);
    const reqRes = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    const res = await request(app)
      .patch(`/api/admin/payouts/${reqRes.body._id}/approve`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/payouts/:id/reject", () => {
  test("rejecting never touches the ledger", async () => {
    await creditEarning(1000);
    const reqRes = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    const rejectRes = await request(app)
      .patch(`/api/admin/payouts/${reqRes.body._id}/reject`)
      .set("Authorization", `Bearer ${token(admin)}`)
      .send({ note: "Suspicious activity" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe("rejected");

    const txs = await Transaction.find({ collector: collector._id, type: "payout" });
    expect(txs).toHaveLength(0);

    const summary = await request(app)
      .get("/api/wallet/summary")
      .set("Authorization", `Bearer ${token(collector)}`);
    expect(summary.body.balance.available).toBe(1000); // rejected — nothing reserved anymore
  });

  test("a rejected collector can submit a new request afterward", async () => {
    await creditEarning(1000);
    const first = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    await request(app)
      .patch(`/api/admin/payouts/${first.body._id}/reject`)
      .set("Authorization", `Bearer ${token(admin)}`);

    const second = await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 500 });

    expect(second.status).toBe(201);
  });
});

describe("GET /api/wallet/payouts", () => {
  test("returns only the requesting collector's own history", async () => {
    await creditEarning(1000);
    await request(app)
      .post("/api/wallet/payout")
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ amount: 300 });

    const otherCollector = await User.create({
      name: "Other Collector",
      email: "other@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .get("/api/wallet/payouts")
      .set("Authorization", `Bearer ${token(otherCollector)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});