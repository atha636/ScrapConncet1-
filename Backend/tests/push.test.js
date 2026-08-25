const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const PushSubscription = require("../src/models/PushSubscription");
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

let user, otherUser;

const validKeys = { p256dh: "test-p256dh-key", auth: "test-auth-key" };
const endpointA = "https://fcm.googleapis.com/fcm/send/device-a";
const endpointB = "https://fcm.googleapis.com/fcm/send/device-b";

beforeEach(async () => {
  user = await User.create({
    name: "Push User",
    email: "push@example.com",
    password: "Password123",
    role: "user",
  });
  otherUser = await User.create({
    name: "Other User",
    email: "other-push@example.com",
    password: "Password123",
    role: "user",
  });
});

describe("GET /api/push/vapid-public-key", () => {
  test("works without auth and reports enabled: false when no VAPID keys are configured", async () => {
    // The test environment never sets VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY, so
    // this exercises the "push isn't configured on this deployment" branch.
    const res = await request(app).get("/api/push/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.publicKey).toBeNull();
  });
});

describe("POST /api/push/subscribe", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .send({ endpoint: endpointA, keys: validKeys });
    expect(res.status).toBe(401);
  });

  test("rejects a missing endpoint with 400", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ keys: validKeys });
    expect(res.status).toBe(400);
  });

  test("rejects an endpoint that isn't a URL with 400", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: "not-a-url", keys: validKeys });
    expect(res.status).toBe(400);
  });

  test("rejects missing subscription keys with 400", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA, keys: { p256dh: "only-one-key" } });
    expect(res.status).toBe(400);
  });

  test("creates a subscription for the authenticated user", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA, keys: validKeys });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const stored = await PushSubscription.findOne({ endpoint: endpointA });
    expect(stored).not.toBeNull();
    expect(String(stored.user)).toBe(String(user._id));
    expect(stored.keys.p256dh).toBe(validKeys.p256dh);
  });

  test("resubscribing on the same endpoint upserts rather than duplicating", async () => {
    await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA, keys: validKeys });

    const updatedKeys = { p256dh: "rotated-key", auth: "rotated-auth" };
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA, keys: updatedKeys });

    expect(res.status).toBe(201);

    const all = await PushSubscription.find({ endpoint: endpointA });
    expect(all).toHaveLength(1);
    expect(all[0].keys.p256dh).toBe("rotated-key");
  });

  test("re-subscribing to the same endpoint under a different account reassigns ownership", async () => {
    // A shared/reset device re-registering under a new signed-in user is the
    // realistic case this covers — the endpoint is the natural upsert key,
    // and ownership should follow whoever most recently subscribed it.
    await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA, keys: validKeys });

    await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${token(otherUser)}`)
      .send({ endpoint: endpointA, keys: validKeys });

    const stored = await PushSubscription.findOne({ endpoint: endpointA });
    expect(String(stored.user)).toBe(String(otherUser._id));
  });
});

describe("POST /api/push/unsubscribe", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app).post("/api/push/unsubscribe").send({ endpoint: endpointA });
    expect(res.status).toBe(401);
  });

  test("rejects a missing endpoint with 400", async () => {
    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("removes the caller's own subscription", async () => {
    await PushSubscription.create({ user: user._id, endpoint: endpointA, keys: validKeys });

    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stored = await PushSubscription.findOne({ endpoint: endpointA });
    expect(stored).toBeNull();
  });

  test("never removes another user's subscription, even for the same endpoint value elsewhere", async () => {
    await PushSubscription.create({ user: otherUser._id, endpoint: endpointB, keys: validKeys });

    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointB });

    expect(res.status).toBe(200); // deleteOne matching nothing is still a "success" no-op

    const stillThere = await PushSubscription.findOne({ endpoint: endpointB });
    expect(stillThere).not.toBeNull();
  });

  test("is a no-op (still 200) when the endpoint was never subscribed", async () => {
    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${token(user)}`)
      .send({ endpoint: endpointA });
    expect(res.status).toBe(200);
  });
});