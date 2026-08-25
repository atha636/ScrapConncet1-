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

let requester, collector, stranger, pendingPickup, activePickup;

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
  stranger = await User.create({
    name: "Stranger",
    email: "stranger@example.com",
    password: "Password123",
    role: "user",
  });

  // Chat only opens once a collector is assigned — see assertChatAccess.
  pendingPickup = await Pickup.create({
    user: requester._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    location: { lat: 30.73, lng: 76.77, address: "Test address" },
    price: 100,
    statusHistory: [{ status: "pending", changedBy: requester._id }],
  });

  activePickup = await Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "plastic",
    estimatedWeightKg: 3,
    location: { lat: 30.73, lng: 76.77, address: "Test address" },
    price: 60,
    status: "accepted",
    statusHistory: [{ status: "accepted", changedBy: collector._id }],
  });
});

describe("GET /api/pickup/:id/messages", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app).get(`/api/pickup/${activePickup._id}/messages`);
    expect(res.status).toBe(401);
  });

  test("returns 404 for a pickup that doesn't exist", async () => {
    const res = await request(app)
      .get(`/api/pickup/${requester._id}/messages`) // any valid-looking ObjectId that isn't a pickup
      .set("Authorization", `Bearer ${token(requester)}`);
    expect(res.status).toBe(404);
  });

  test("rejects access to a pickup that's still pending (no collector assigned yet)", async () => {
    const res = await request(app)
      .get(`/api/pickup/${pendingPickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`);
    expect(res.status).toBe(403);
  });

  test("rejects a user who is neither the requester nor the assigned collector", async () => {
    const res = await request(app)
      .get(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(stranger)}`);
    expect(res.status).toBe(403);
  });

  test("returns messages oldest-first for the requester", async () => {
    await Message.create({ pickup: activePickup._id, sender: collector._id, text: "On my way" });
    await Message.create({ pickup: activePickup._id, sender: requester._id, text: "Great, thanks" });

    const res = await request(app)
      .get(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].text).toBe("On my way");
    expect(res.body[1].text).toBe("Great, thanks");
    expect(res.body[0].sender.name).toBe("Collector");
  });

  test("returns messages for the assigned collector too", async () => {
    await Message.create({ pickup: activePickup._id, sender: requester._id, text: "Hi there" });

    const res = await request(app)
      .get(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(collector)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("POST /api/pickup/:id/messages", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app).post(`/api/pickup/${activePickup._id}/messages`).send({ text: "Hi" });
    expect(res.status).toBe(401);
  });

  test("rejects an empty message with 400", async () => {
    const res = await request(app)
      .post(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ text: "   " });
    expect(res.status).toBe(400);
  });

  test("rejects a message over 1000 characters with 400", async () => {
    const res = await request(app)
      .post(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ text: "a".repeat(1001) });
    expect(res.status).toBe(400);
  });

  test("rejects sending to a pending pickup (no collector assigned yet)", async () => {
    const res = await request(app)
      .post(`/api/pickup/${pendingPickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ text: "Hello?" });
    expect(res.status).toBe(403);
  });

  test("rejects a user who isn't part of this pickup", async () => {
    const res = await request(app)
      .post(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(stranger)}`)
      .send({ text: "Let me in" });
    expect(res.status).toBe(403);
  });

  test("creates and returns the message, populated with the sender", async () => {
    const res = await request(app)
      .post(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ text: "See you soon" });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe("See you soon");
    expect(res.body.sender.name).toBe("Requester");
    expect(res.body.sender.role).toBe("user");

    const stored = await Message.findById(res.body._id);
    expect(stored).not.toBeNull();
    expect(String(stored.pickup)).toBe(String(activePickup._id));
  });

  test("notifies the other participant, not the sender", async () => {
    const Notification = require("../src/models/Notification");

    await request(app)
      .post(`/api/pickup/${activePickup._id}/messages`)
      .set("Authorization", `Bearer ${token(requester)}`)
      .send({ text: "Are you close?" });

    const collectorNotifications = await Notification.find({ recipient: collector._id });
    const requesterNotifications = await Notification.find({ recipient: requester._id });

    expect(collectorNotifications).toHaveLength(1);
    expect(collectorNotifications[0].type).toBe("new_message");
    expect(requesterNotifications).toHaveLength(0);
  });
});