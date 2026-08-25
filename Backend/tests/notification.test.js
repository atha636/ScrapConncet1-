const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Notification = require("../src/models/Notification");
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

beforeEach(async () => {
  user = await User.create({
    name: "Notified User",
    email: "notified@example.com",
    password: "Password123",
    role: "user",
  });
  otherUser = await User.create({
    name: "Other User",
    email: "other@example.com",
    password: "Password123",
    role: "user",
  });
});

describe("GET /api/notifications", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  test("returns only the requesting user's own notifications", async () => {
    await Notification.create({ recipient: user._id, type: "status_update", text: "For you" });
    await Notification.create({ recipient: otherUser._id, type: "status_update", text: "Not for you" });

    const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${token(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].text).toBe("For you");
  });

  test("returns newest first", async () => {
    await Notification.create({ recipient: user._id, type: "status_update", text: "First" });
    await new Promise((r) => setTimeout(r, 5));
    await Notification.create({ recipient: user._id, type: "status_update", text: "Second" });

    const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${token(user)}`);

    expect(res.body.data[0].text).toBe("Second");
    expect(res.body.data[1].text).toBe("First");
  });

  test("reports an accurate unreadCount independent of pagination", async () => {
    await Notification.create({ recipient: user._id, type: "status_update", text: "Unread 1", read: false });
    await Notification.create({ recipient: user._id, type: "status_update", text: "Unread 2", read: false });
    await Notification.create({ recipient: user._id, type: "status_update", text: "Already read", read: true });

    const res = await request(app)
      .get("/api/notifications")
      .query({ limit: 1 })
      .set("Authorization", `Bearer ${token(user)}`);

    expect(res.body.data).toHaveLength(1); // paginated
    expect(res.body.total).toBe(3); // all of this user's notifications
    expect(res.body.unreadCount).toBe(2); // unaffected by the page size
  });
});

describe("PATCH /api/notifications/:id/read", () => {
  test("returns 401 with no token", async () => {
    const notification = await Notification.create({ recipient: user._id, type: "status_update", text: "Hi" });
    const res = await request(app).patch(`/api/notifications/${notification._id}/read`);
    expect(res.status).toBe(401);
  });

  test("marks the given notification as read", async () => {
    const notification = await Notification.create({
      recipient: user._id,
      type: "status_update",
      text: "Hi",
      read: false,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set("Authorization", `Bearer ${token(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);

    const stored = await Notification.findById(notification._id);
    expect(stored.read).toBe(true);
  });

  test("returns 404 for another user's notification (can't mark someone else's as read)", async () => {
    const notification = await Notification.create({
      recipient: otherUser._id,
      type: "status_update",
      text: "Not yours",
    });

    const res = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set("Authorization", `Bearer ${token(user)}`);

    expect(res.status).toBe(404);

    const stored = await Notification.findById(notification._id);
    expect(stored.read).toBe(false);
  });

  test("returns 404 for a notification that doesn't exist", async () => {
    const res = await request(app)
      .patch(`/api/notifications/${user._id}/read`) // valid ObjectId shape, not a real notification
      .set("Authorization", `Bearer ${token(user)}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/notifications/read-all", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app).patch("/api/notifications/read-all");
    expect(res.status).toBe(401);
  });

  test("marks every unread notification for this user as read, and none of anyone else's", async () => {
    await Notification.create({ recipient: user._id, type: "status_update", text: "A", read: false });
    await Notification.create({ recipient: user._id, type: "status_update", text: "B", read: false });
    const otherUnread = await Notification.create({
      recipient: otherUser._id,
      type: "status_update",
      text: "C",
      read: false,
    });

    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const mine = await Notification.find({ recipient: user._id });
    expect(mine.every((n) => n.read)).toBe(true);

    const theirs = await Notification.findById(otherUnread._id);
    expect(theirs.read).toBe(false);
  });

  test("is a no-op (still 200) when there's nothing unread", async () => {
    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token(user)}`);
    expect(res.status).toBe(200);
  });
});