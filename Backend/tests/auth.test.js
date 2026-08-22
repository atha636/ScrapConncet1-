const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/models/User");
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