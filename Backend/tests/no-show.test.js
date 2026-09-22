const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { NO_SHOW_SUSPENSION_THRESHOLD } = require("../src/utils/reliabilityRules");

const app = createApp();

let requester, collector;

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
  return jwt.sign({ id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET);
}

async function createAcceptedPickup({ stalled }) {
  const pickup = await Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    location: { lat: 30.7, lng: 76.7, address: "Test" },
    price: 100,
    status: "accepted",
    isStalled: stalled,
    stalledAt: stalled ? new Date() : null,
    statusHistory: [
      { status: "pending", changedBy: requester._id },
      { status: "accepted", changedBy: collector._id },
    ],
  });
  return pickup._id;
}

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
});

describe("POST /api/pickup/:id/report-no-show", () => {
  test("reopens the pickup, clears the collector, and increments their no-show count", async () => {
    const pickupId = await createAcceptedPickup({ stalled: true });

    const res = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ note: "Never showed up" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(res.body.collector).toBeNull();
    expect(res.body.isStalled).toBe(false);

    const updatedCollector = await User.findById(collector._id);
    expect(updatedCollector.noShowCount).toBe(1);
    expect(updatedCollector.collectorSuspended).toBe(false);
  });

  test("rejects reporting a pickup that hasn't stalled yet", async () => {
    const pickupId = await createAcceptedPickup({ stalled: false });

    const res = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});

    expect(res.status).toBe(400);

    const untouched = await Pickup.findById(pickupId);
    expect(untouched.status).toBe("accepted");
    expect(untouched.collector).not.toBeNull();
  });

  test("only the requester who owns the pickup can report it", async () => {
    const pickupId = await createAcceptedPickup({ stalled: true });
    const otherUser = await User.create({
      name: "Someone Else",
      email: "someoneelse@example.com",
      password: "Password123",
      role: "user",
    });

    const res = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(otherUser)}`)
      .send({});

    expect(res.status).toBe(403);
  });

  test("a collector cannot call this endpoint", async () => {
    const pickupId = await createAcceptedPickup({ stalled: true });

    const res = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(collector)}`)
      .send({});

    expect(res.status).toBe(403);
  });

  test("cannot report a pickup that isn't currently accepted", async () => {
    const pickup = await Pickup.create({
      user: requester._id,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { lat: 30.7, lng: 76.7, address: "Test" },
      price: 100,
      status: "pending",
      statusHistory: [{ status: "pending", changedBy: requester._id }],
    });

    const res = await request(app)
      .post(`/api/pickup/${pickup._id}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test("reporting the same pickup twice only records one no-show", async () => {
    const pickupId = await createAcceptedPickup({ stalled: true });

    const first = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});
    expect(first.status).toBe(200);

    // The pickup is "pending" now, not "accepted" with isStalled: true —
    // a second call against the same id no longer matches the filter
    // (see reportNoShow's atomic findOneAndUpdate), so it fails cleanly
    // rather than recording a second strike against the same collector.
    const second = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});
    expect(second.status).toBe(400);

    const updatedCollector = await User.findById(collector._id);
    expect(updatedCollector.noShowCount).toBe(1);
  });

  test(`suspends the collector once their no-show count reaches ${NO_SHOW_SUSPENSION_THRESHOLD}`, async () => {
    await User.findByIdAndUpdate(collector._id, { noShowCount: NO_SHOW_SUSPENSION_THRESHOLD - 1 });
    const pickupId = await createAcceptedPickup({ stalled: true });

    const res = await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});

    expect(res.status).toBe(200);

    const updatedCollector = await User.findById(collector._id);
    expect(updatedCollector.noShowCount).toBe(NO_SHOW_SUSPENSION_THRESHOLD);
    expect(updatedCollector.collectorSuspended).toBe(true);
    expect(updatedCollector.collectorSuspendedAt).toBeTruthy();
  });

  test("the reopened pickup can be accepted by a different collector", async () => {
    const pickupId = await createAcceptedPickup({ stalled: true });
    await request(app)
      .post(`/api/pickup/${pickupId}/report-no-show`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});

    const newCollector = await User.create({
      name: "New Collector",
      email: "newcollector@example.com",
      password: "Password123",
      role: "collector",
    });

    const res = await request(app)
      .patch(`/api/pickup/${pickupId}/accept`)
      .set("Authorization", `Bearer ${token(newCollector)}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
    expect(String(res.body.collector._id || res.body.collector)).toBe(String(newCollector._id));
  });
});