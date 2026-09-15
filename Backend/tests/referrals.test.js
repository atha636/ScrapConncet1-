const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Referral = require("../src/models/Referral");
const Transaction = require("../src/models/Transaction");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { ensureReferralCode } = require("../src/utils/referralCode");
const { activateReferralIfEligible } = require("../src/utils/referralActivation");
const { REFERRAL_BONUS_AMOUNT } = require("../src/utils/referralRules");

const app = createApp();
const fakeIo = { to: () => ({ emit: () => {} }) };

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

describe("ensureReferralCode", () => {
  test("generates and persists a code for a user without one", async () => {
    const user = await User.create({
      name: "Test User",
      email: "code-gen@example.com",
      password: "Password123",
      role: "user",
    });
    expect(user.referralCode).toBeUndefined();

    const code = await ensureReferralCode(user);
    expect(code).toHaveLength(8);

    const reloaded = await User.findById(user._id);
    expect(reloaded.referralCode).toBe(code);
  });

  test("is idempotent — returns the same code on a second call", async () => {
    const user = await User.create({
      name: "Test User",
      email: "code-gen-idempotent@example.com",
      password: "Password123",
      role: "user",
    });
    const first = await ensureReferralCode(user);
    const second = await ensureReferralCode(user);
    expect(second).toBe(first);
  });
});

describe("POST /api/auth/register with a referral code", () => {
  test("attaches a referral when a valid code is supplied", async () => {
    const referrer = await User.create({
      name: "Referrer",
      email: "referrer@example.com",
      password: "Password123",
      role: "collector",
    });
    const code = await ensureReferralCode(referrer);

    const res = await request(app).post("/api/auth/register").send({
      name: "New Signup",
      email: "new-signup@example.com",
      password: "Password123",
      referralCode: code,
    });

    expect(res.status).toBe(201);
    const newUser = await User.findOne({ email: "new-signup@example.com" });
    expect(String(newUser.referredBy)).toBe(String(referrer._id));

    const referral = await Referral.findOne({ referee: newUser._id });
    expect(referral).toBeTruthy();
    expect(referral.status).toBe("pending");
    expect(String(referral.referrer)).toBe(String(referrer._id));
  });

  test("accepts a lowercase-typed code (case-insensitive)", async () => {
    const referrer = await User.create({
      name: "Referrer",
      email: "referrer-case@example.com",
      password: "Password123",
      role: "collector",
    });
    const code = await ensureReferralCode(referrer);

    const res = await request(app).post("/api/auth/register").send({
      name: "New Signup",
      email: "new-signup-case@example.com",
      password: "Password123",
      referralCode: code.toLowerCase(),
    });

    expect(res.status).toBe(201);
    const newUser = await User.findOne({ email: "new-signup-case@example.com" });
    expect(String(newUser.referredBy)).toBe(String(referrer._id));
  });

  test("registration still succeeds with a bogus code — just doesn't attach a referral", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "New Signup",
      email: "new-signup-bad-code@example.com",
      password: "Password123",
      referralCode: "NOTREAL1",
    });

    expect(res.status).toBe(201);
    const newUser = await User.findOne({ email: "new-signup-bad-code@example.com" });
    expect(newUser.referredBy).toBeNull();
    const referral = await Referral.findOne({ referee: newUser._id });
    expect(referral).toBeNull();
  });

  test("registration succeeds fine with no code at all", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "New Signup",
      email: "new-signup-no-code@example.com",
      password: "Password123",
    });
    expect(res.status).toBe(201);
  });
});

describe("activateReferralIfEligible", () => {
  test("does nothing if the referee has no pending referral", async () => {
    const someone = await User.create({
      name: "Someone",
      email: "no-referral@example.com",
      password: "Password123",
      role: "user",
    });
    await expect(activateReferralIfEligible(fakeIo, someone._id)).resolves.not.toThrow();
  });

  test("credits a collector-role referrer once the referee (a collector) completes their first pickup", async () => {
    const referrer = await User.create({
      name: "Referrer Collector",
      email: "referrer-collector@example.com",
      password: "Password123",
      role: "collector",
    });
    const referee = await User.create({
      name: "Referred Collector",
      email: "referee-collector@example.com",
      password: "Password123",
      role: "collector",
      referredBy: referrer._id,
    });
    await Referral.create({ referrer: referrer._id, referee: referee._id });

    const requester = await User.create({
      name: "Requester",
      email: "requester-for-referee@example.com",
      password: "Password123",
      role: "user",
    });
    await Pickup.create({
      user: requester._id,
      collector: referee._id,
      scrapType: "metal",
      price: 100,
      status: "completed",
      location: { lat: 12.9, lng: 77.6 },
    });

    await activateReferralIfEligible(fakeIo, referee._id);

    const referral = await Referral.findOne({ referee: referee._id });
    expect(referral.status).toBe("completed");
    expect(referral.rewardAmount).toBe(REFERRAL_BONUS_AMOUNT);
    expect(referral.rewardedAt).toBeTruthy();

    const txn = await Transaction.findOne({ collector: referrer._id, type: "referral_bonus" });
    expect(txn).toBeTruthy();
    expect(txn.amount).toBe(REFERRAL_BONUS_AMOUNT);
  });

  test("activates with a 0 reward when the referrer is a requester (no wallet to credit)", async () => {
    const referrer = await User.create({
      name: "Referrer Requester",
      email: "referrer-requester@example.com",
      password: "Password123",
      role: "user",
    });
    const referee = await User.create({
      name: "Referred Requester",
      email: "referee-requester@example.com",
      password: "Password123",
      role: "user",
      referredBy: referrer._id,
    });
    await Referral.create({ referrer: referrer._id, referee: referee._id });

    const collector = await User.create({
      name: "Collector",
      email: "collector-for-referee@example.com",
      password: "Password123",
      role: "collector",
    });
    await Pickup.create({
      user: referee._id,
      collector: collector._id,
      scrapType: "metal",
      price: 100,
      status: "completed",
      location: { lat: 12.9, lng: 77.6 },
    });

    await activateReferralIfEligible(fakeIo, referee._id);

    const referral = await Referral.findOne({ referee: referee._id });
    expect(referral.status).toBe("completed");
    expect(referral.rewardAmount).toBe(0);

    const txn = await Transaction.findOne({ collector: referrer._id, type: "referral_bonus" });
    expect(txn).toBeNull();
  });

  test("does not double-credit if called twice", async () => {
    const referrer = await User.create({
      name: "Referrer",
      email: "referrer-double@example.com",
      password: "Password123",
      role: "collector",
    });
    const referee = await User.create({
      name: "Referee",
      email: "referee-double@example.com",
      password: "Password123",
      role: "collector",
      referredBy: referrer._id,
    });
    await Referral.create({ referrer: referrer._id, referee: referee._id });

    const requester = await User.create({
      name: "Requester",
      email: "requester-double@example.com",
      password: "Password123",
      role: "user",
    });
    await Pickup.create({
      user: requester._id,
      collector: referee._id,
      scrapType: "metal",
      price: 100,
      status: "completed",
      location: { lat: 12.9, lng: 77.6 },
    });

    await activateReferralIfEligible(fakeIo, referee._id);
    await activateReferralIfEligible(fakeIo, referee._id);

    const txns = await Transaction.find({ collector: referrer._id, type: "referral_bonus" });
    expect(txns).toHaveLength(1);
  });

  test("a pickup completed as a requester activates a referral for that role, not the collector's", async () => {
    // The referee here is registered as role "user" — completing a pickup
    // as the requester (not accepting one as a collector) should still be
    // enough to activate their referral.
    const referrer = await User.create({
      name: "Referrer",
      email: "referrer-req-side@example.com",
      password: "Password123",
      role: "collector",
    });
    const referee = await User.create({
      name: "Referee Requester",
      email: "referee-req-side@example.com",
      password: "Password123",
      role: "user",
      referredBy: referrer._id,
    });
    await Referral.create({ referrer: referrer._id, referee: referee._id });

    const collector = await User.create({
      name: "Collector",
      email: "collector-req-side@example.com",
      password: "Password123",
      role: "collector",
    });
    await Pickup.create({
      user: referee._id,
      collector: collector._id,
      scrapType: "metal",
      price: 100,
      status: "completed",
      location: { lat: 12.9, lng: 77.6 },
    });

    await activateReferralIfEligible(fakeIo, referee._id);

    const referral = await Referral.findOne({ referee: referee._id });
    expect(referral.status).toBe("completed");
  });
});

describe("GET /api/referrals/me", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/referrals/me");
    expect(res.status).toBe(401);
  });

  test("returns the user's own code (generating one if missing) and their referral list", async () => {
    const referrer = await User.create({
      name: "Referrer",
      email: "referrals-me@example.com",
      password: "Password123",
      role: "collector",
    });
    const referee = await User.create({
      name: "Referred Person",
      email: "referrals-me-referee@example.com",
      password: "Password123",
      role: "user",
    });
    await Referral.create({ referrer: referrer._id, referee: referee._id, status: "completed", rewardAmount: 50 });

    const res = await request(app)
      .get("/api/referrals/me")
      .set("Authorization", `Bearer ${token(referrer)}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toHaveLength(8);
    expect(res.body.totalRewardEarned).toBe(50);
    expect(res.body.referrals).toHaveLength(1);
    expect(res.body.referrals[0].refereeName).toBe("Referred Person");
  });
});

describe("GET /api/referrals/validate/:code", () => {
  test("returns valid: true with just a first name for a real code", async () => {
    const referrer = await User.create({
      name: "Jane Doe",
      email: "validate-real@example.com",
      password: "Password123",
      role: "user",
    });
    const code = await ensureReferralCode(referrer);

    const res = await request(app).get(`/api/referrals/validate/${code}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.referrerName).toBe("Jane");
  });

  test("returns valid: false for a nonexistent code, with no auth required", async () => {
    const res = await request(app).get("/api/referrals/validate/NOTREAL1");
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
  });
});