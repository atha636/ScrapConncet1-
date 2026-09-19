const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Message = require("../src/models/Message");
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

async function makeActivePickup(requester, collector) {
  return Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "plastic",
    estimatedWeightKg: 3,
    location: { lat: 30.73, lng: 76.77, address: "Test address" },
    price: 60,
    status: "accepted",
    statusHistory: [{ status: "accepted", changedBy: collector._id }],
  });
}

describe("POST /api/pickup/:id/messages — text/image requirement", () => {
  test("rejects a completely empty message (no text, no image)", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "msg-empty-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "msg-empty-col@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makeActivePickup(requester, collector);

    const res = await request(app)
      .post(`/api/pickup/${pickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test("still accepts a plain text-only JSON message exactly as before", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "msg-text-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "msg-text-col@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makeActivePickup(requester, collector);

    const res = await request(app)
      .post(`/api/pickup/${pickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ text: "Hello there" });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe("Hello there");
    expect(res.body.image).toBeNull();
    expect(res.body.readAt).toBeNull();
  });
});

describe("PATCH /api/pickup/:id/messages/read", () => {
  test("requires auth", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "msg-read-auth-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "msg-read-auth-col@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makeActivePickup(requester, collector);

    const res = await request(app).patch(`/api/pickup/${pickup._id}/messages/read`);
    expect(res.status).toBe(401);
  });

  test("rejects a stranger who isn't part of this pickup", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "msg-read-stranger-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "msg-read-stranger-col@example.com",
      password: "Password123",
      role: "collector",
    });
    const stranger = await User.create({
      name: "Stranger",
      email: "msg-read-stranger@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await makeActivePickup(requester, collector);

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/messages/read`)
      .set("Authorization", `Bearer ${token(stranger)}`);
    expect(res.status).toBe(403);
  });

  test("marks only the other party's unread messages as read, not the reader's own", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "msg-read-mark-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "msg-read-mark-col@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makeActivePickup(requester, collector);

    await Message.create({ pickup: pickup._id, sender: collector._id, text: "Hi, on my way" });
    await Message.create({ pickup: pickup._id, sender: collector._id, text: "Almost there" });
    await Message.create({ pickup: pickup._id, sender: requester._id, text: "Great, thanks" });

    const res = await request(app)
      .patch(`/api/pickup/${pickup._id}/messages/read`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body.marked).toBe(2);

    const messages = await Message.find({ pickup: pickup._id }).sort({ createdAt: 1 });
    expect(messages[0].readAt).toBeTruthy();
    expect(messages[1].readAt).toBeTruthy();
    // The requester's own message shouldn't be touched by marking things
    // read on their end — only what the *other* party sent.
    expect(messages[2].readAt).toBeNull();
  });

  test("marking read twice in a row only reports newly-marked messages the second time", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "msg-read-twice-req@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "msg-read-twice-col@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makeActivePickup(requester, collector);
    await Message.create({ pickup: pickup._id, sender: collector._id, text: "Hello" });

    const first = await request(app)
      .patch(`/api/pickup/${pickup._id}/messages/read`)
      .set("Authorization", `Bearer ${token(requester)}`);
    expect(first.body.marked).toBe(1);

    const second = await request(app)
      .patch(`/api/pickup/${pickup._id}/messages/read`)
      .set("Authorization", `Bearer ${token(requester)}`);
    expect(second.body.marked).toBe(0);
  });
});