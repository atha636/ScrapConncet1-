const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const app = createApp();

// Starting an in-memory MongoDB (and, on a cold cache, downloading its
// binary) can legitimately take longer than Jest's default 20s hook
// timeout on a slow connection or a loaded CI runner — bumping this
// specific hook avoids that showing up as a flaky, unrelated-looking
// failure. Retry logic for genuine transient failures lives in
// connect() itself (see tests/helpers/db.js).
beforeAll(async () => {
  await connect();
}, 60000);

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

const validUser = {
  name: "Atharv Patidar",
  email: "atharv@example.com",
  password: "Password123",
  phone: "9876543210",
};

describe("POST /api/auth/register", () => {
  test("creates a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(validUser.email);
    // password (and its hash-bearing fields) must never be returned
    expect(res.body.user.password).toBeUndefined();
  });

  test("defaults to role 'user' even if the client tries to pass role directly", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, role: "admin" });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");
  });

  test("registers as a collector when wantsToBeCollector is true", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, wantsToBeCollector: true });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("collector");
  });

  test("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.status).toBe(409);
  });

  test("rejects a password without a number", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "other@example.com", password: "onlyletters" });

    expect(res.status).toBe(400);
  });

  test("rejects a missing name", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "noname@example.com", password: "Password123" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(validUser);
  });

  test("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test("rejects an incorrect password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "WrongPassword1" });

    expect(res.status).toBe(401);
  });

  test("rejects a non-existent email with 401 (not 404 — avoids leaking which emails exist)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password123" });

    expect(res.status).toBe(401);
  });

  test("rejects a deactivated account with 403", async () => {
    await User.updateOne({ email: validUser.email }, { isActive: false });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/auth/me", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("returns 401 with a garbage token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  test("returns the current user's profile with a valid token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(validUser);
    const token = registerRes.body.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(validUser.email);
  });
});

describe("DELETE /api/auth/me", () => {
  const register = () => request(app).post("/api/auth/register").send(validUser);

  test("returns 401 with no token", async () => {
    const res = await request(app).delete("/api/auth/me").send({ password: "x", confirm: "DELETE" });
    expect(res.status).toBe(401);
  });

  test("rejects a missing/incorrect confirm literal with 400", async () => {
    const { body } = await register();
    const res = await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: validUser.password, confirm: "delete" });

    expect(res.status).toBe(400);
  });

  test("rejects a missing password for a password-based account with 400", async () => {
    const { body } = await register();
    const res = await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ confirm: "DELETE" });

    expect(res.status).toBe(400);
  });

  test("rejects an incorrect password with 401", async () => {
    const { body } = await register();
    const res = await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: "WrongPassword1", confirm: "DELETE" });

    expect(res.status).toBe(401);
  });

  test("soft-deletes the account, scrubs personal info, and revokes the token", async () => {
    const { body } = await register();
    const res = await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: validUser.password, confirm: "DELETE" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stored = await User.findById(body.user._id ?? body.user.id);
    expect(stored.isActive).toBe(false);
    expect(stored.deletedAt).toBeTruthy();
    expect(stored.name).toBe("Deleted user");
    expect(stored.email).not.toBe(validUser.email);
    expect(stored.phone).toBeUndefined();

    // The token used to delete the account is revoked immediately too, but
    // isActive is checked first in the auth middleware (see middleware/auth.js),
    // so the response is 403 "deactivated" rather than a generic 401 here.
    const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);
    expect(meRes.status).toBe(403);
  });

  test("frees up the original email for a new registration", async () => {
    const { body } = await register();
    await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: validUser.password, confirm: "DELETE" });

    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(201);
  });

  test("a deleted account can no longer log in", async () => {
    const { body } = await register();
    await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: validUser.password, confirm: "DELETE" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    // Deletion scrubs the email (freeing it up for reuse — see "frees up
    // the original email" above), so a login attempt against the *original*
    // email now matches no user at all. That correctly falls into the
    // generic "Invalid email or password" 401 rather than leaking that this
    // email used to belong to someone via a distinct "deactivated" message.
    expect(res.status).toBe(401);
  });

  test("cancels the user's own open pickup requests so they stop appearing to collectors", async () => {
    const { body } = await register();
    const userId = body.user._id ?? body.user.id;

    const pickup = await Pickup.create({
      user: userId,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { lat: 30.73, lng: 76.77, address: "Test address" },
      price: 100,
      statusHistory: [{ status: "pending", changedBy: userId }],
    });

    await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: validUser.password, confirm: "DELETE" });

    const updated = await Pickup.findById(pickup._id);
    expect(updated.status).toBe("cancelled");
  });

  test("blocks deletion while the account has an active collector job", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "req-active@example.com",
      password: "Password123",
    });
    const collectorRes = await request(app).post("/api/auth/register").send({
      ...validUser,
      email: "collector-active@example.com",
      wantsToBeCollector: true,
    });
    const collectorId = collectorRes.body.user._id ?? collectorRes.body.user.id;

    await Pickup.create({
      user: requester._id,
      collector: collectorId,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { lat: 30.73, lng: 76.77, address: "Test address" },
      price: 100,
      status: "accepted",
      statusHistory: [{ status: "accepted", changedBy: collectorId }],
    });

    const res = await request(app)
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${collectorRes.body.token}`)
      .send({ password: validUser.password, confirm: "DELETE" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/auth/change-password", () => {
  test("returns 401 with no token", async () => {
    const res = await request(app)
      .patch("/api/auth/change-password")
      .send({ currentPassword: validUser.password, newPassword: "NewPass123" });
    expect(res.status).toBe(401);
  });

  test("rejects an incorrect current password with 401", async () => {
    const { body } = await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ currentPassword: "WrongPassword1", newPassword: "NewPass123" });
    expect(res.status).toBe(401);
  });

  test("changes the password and returns a fresh, usable token", async () => {
    const { body } = await request(app).post("/api/auth/register").send(validUser);

    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ currentPassword: validUser.password, newPassword: "NewPass123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "NewPass123" });
    expect(loginRes.status).toBe(200);
  });

  test("revokes the old session — the token used to change it stops working immediately", async () => {
    const { body } = await request(app).post("/api/auth/register").send(validUser);

    await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ currentPassword: validUser.password, newPassword: "NewPass123" });

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(401);
  });

  // Regression test: a Google-only account has no `password` field at all
  // (see models/User.js), and bcrypt.compare() throws on an undefined hash
  // rather than returning false. Before this was guarded explicitly, this
  // request crashed with a generic 500 instead of a clear message.
  test("returns a clear 400, not a 500, for a Google-only account with no password to change", async () => {
    const googleUser = await User.create({
      name: "Google User",
      email: "google-user@example.com",
      googleId: "google-sub-12345",
      isVerified: true,
    });
    const googleToken = jwt.sign(
      { id: googleUser._id, role: googleUser.role, sessionVersion: 0 },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${googleToken}`)
      .send({ currentPassword: "anything", newPassword: "NewPass123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Google/i);
  });
});

describe("POST /api/auth/forgot-password", () => {
  test("responds the same way for a registered and an unregistered email (no user enumeration)", async () => {
    await request(app).post("/api/auth/register").send(validUser);

    const known = await request(app).post("/api/auth/forgot-password").send({ email: validUser.email });
    const unknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
  });

  test("sets a reset token on the user when the email exists", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    await request(app).post("/api/auth/forgot-password").send({ email: validUser.email });

    const user = await User.findOne({ email: validUser.email }).select("+resetTokenHash +resetTokenExpires");
    expect(user.resetTokenHash).toBeTruthy();
    expect(user.resetTokenExpires.getTime()).toBeGreaterThan(Date.now());
  });
});