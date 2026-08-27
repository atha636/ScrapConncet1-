const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Transaction = require("../src/models/Transaction");
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

let requester, collector, otherCollector;

beforeEach(async () => {
  requester = await User.create({
    name: "Requester",
    email: "requester@example.com",
    password: "Password123",
    role: "user",
  });
  collector = await User.create({
    name: "Collector",
    email: "collector@example.com",
    password: "Password123",
    role: "collector",
  });
  otherCollector = await User.create({
    name: "Other Collector",
    email: "other-collector@example.com",
    password: "Password123",
    role: "collector",
  });
});

async function makePickup(status, history) {
  return Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    location: { lat: 30.73, lng: 76.77, address: "Test address" },
    price: 200,
    status,
    statusHistory: history,
  });
}

describe("PATCH /api/pickup/:id/status", () => {
  test("rejects a collector who isn't assigned to this pickup", async () => {
    const pickup = await makePickup("accepted", [{ status: "accepted", changedBy: collector._id }]);

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/status`)
      .set("Authorization", `Bearer ${token(otherCollector)}`)
      .send({ status: "in_progress" });

    expect(res.status).toBe(403);
  });

  test("rejects an invalid transition (e.g. pending straight to completed)", async () => {
    const pickup = await Pickup.create({
      user: requester._id,
      collector: collector._id,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { lat: 30.73, lng: 76.77, address: "Test address" },
      price: 200,
      status: "pending",
      statusHistory: [{ status: "pending", changedBy: requester._id }],
    });

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/status`)
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ status: "completed" });

    expect(res.status).toBe(400);
  });

  test("rejects moving backward (completed back to in_progress)", async () => {
    const pickup = await makePickup("completed", [
      { status: "accepted", changedBy: collector._id },
      { status: "in_progress", changedBy: collector._id },
      { status: "completed", changedBy: collector._id },
    ]);

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/status`)
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ status: "in_progress" });

    expect(res.status).toBe(400);
  });

  test("accepted -> in_progress -> completed succeeds and appends one history entry per step", async () => {
    const pickup = await makePickup("accepted", [{ status: "accepted", changedBy: collector._id }]);

    const step1 = await request(app)
      .patch(`/api/pickup/${pickup._id}/status`)
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ status: "in_progress" });
    expect(step1.status).toBe(200);
    expect(step1.body.status).toBe("in_progress");
    expect(step1.body.statusHistory).toHaveLength(2);

    const step2 = await request(app)
      .patch(`/api/pickup/${pickup._id}/status`)
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({ status: "completed" });
    expect(step2.status).toBe(200);
    expect(step2.body.status).toBe("completed");
    expect(step2.body.statusHistory).toHaveLength(3);
  });

  test("two simultaneous requests to mark the same pickup completed: only one succeeds, one history entry, one transaction", async () => {
    const pickup = await makePickup("in_progress", [
      { status: "accepted", changedBy: collector._id },
      { status: "in_progress", changedBy: collector._id },
    ]);

    const complete = () =>
      request(app)
        .patch(`/api/pickup/${pickup._id}/status`)
        .set("Authorization", `Bearer ${token(collector)}`)
        .send({ status: "completed" });

    // Fired concurrently (not awaited one after another) to actually
    // exercise the race, not just call the endpoint twice sequentially.
    const [resA, resB] = await Promise.all([complete(), complete()]);
    const statuses = [resA.status, resB.status].sort();

    // One wins (200), the other loses cleanly (400 — no longer in_progress
    // by the time it's evaluated) rather than both silently succeeding.
    expect(statuses).toEqual([200, 400]);

    const stored = await Pickup.findById(pickup._id);
    expect(stored.status).toBe("completed");
    expect(stored.statusHistory).toHaveLength(3); // accepted, in_progress, completed — not 4

    const transactions = await Transaction.find({ collector: collector._id });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(200);
  });
});

describe("PATCH /api/pickup/:id/cancel", () => {
  async function makeRequesterPickup(status, collectorId = null) {
    return Pickup.create({
      user: requester._id,
      collector: collectorId,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { lat: 30.73, lng: 76.77, address: "Test address" },
      price: 200,
      status,
      statusHistory: [{ status, changedBy: requester._id }],
    });
  }

  test("rejects a user who isn't the requester", async () => {
    const pickup = await makeRequesterPickup("pending");

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/cancel`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(403);
  });

  test("rejects cancelling a pickup that's already in_progress", async () => {
    const pickup = await makeRequesterPickup("in_progress", collector._id);

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/cancel`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(400);
  });

  test("cancels a pending pickup successfully", async () => {
    const pickup = await makeRequesterPickup("pending");

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/cancel`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  test("two simultaneous cancel requests: only one succeeds, one history entry appended", async () => {
    const pickup = await makeRequesterPickup("accepted", collector._id);

    const cancel = () =>
      request(app).patch(`/api/pickup/${pickup._id}/cancel`).set("Authorization", `Bearer ${token(requester)}`);

    const [resA, resB] = await Promise.all([cancel(), cancel()]);
    const statuses = [resA.status, resB.status].sort();

    expect(statuses).toEqual([200, 400]);

    const stored = await Pickup.findById(pickup._id);
    expect(stored.status).toBe("cancelled");
    expect(stored.statusHistory).toHaveLength(2); // accepted, cancelled — not 3
  });
});