const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../src/app");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const app = createApp();

// Roughly real-world distances from a fixed reference point in Chandigarh,
// so we can assert the API returns "near" before "far" — not just that a
// distance number exists.
const CHANDIGARH = { lat: 30.7333, lng: 76.7794 };
const NEARBY_2KM = { lat: 30.7500, lng: 76.7900 }; // ~2km away
const FAR_40KM = { lat: 30.9500, lng: 76.8100 }; // ~40km away, outside a 25km radius

let collectorToken;

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

beforeEach(async () => {
  const collector = await User.create({
    name: "Test Collector",
    email: "collector@example.com",
    password: "Password123",
    role: "collector",
  });
  collectorToken = jwt.sign(
    { id: collector._id, role: "collector", sessionVersion: 0 },
    process.env.JWT_SECRET
  );

  const requester = await User.create({
    name: "Test Requester",
    email: "requester@example.com",
    password: "Password123",
    role: "user",
  });

  await Pickup.create([
    {
      user: requester._id,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { ...FAR_40KM, address: "Far away" },
      price: 100,
      statusHistory: [{ status: "pending", changedBy: requester._id }],
    },
    {
      user: requester._id,
      scrapType: "plastic",
      estimatedWeightKg: 3,
      location: { ...NEARBY_2KM, address: "Just around the corner" },
      price: 60,
      statusHistory: [{ status: "pending", changedBy: requester._id }],
    },
  ]);
});

describe("GET /api/pickup/available", () => {
  test("without coordinates, falls back to newest-first (backward compatible)", async () => {
    const res = await request(app)
      .get("/api/pickup/available")
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].distanceKm).toBeUndefined();
  });

  test("with coordinates, sorts nearest first and includes distanceKm", async () => {
    const res = await request(app)
      .get("/api/pickup/available")
      .query({ lat: CHANDIGARH.lat, lng: CHANDIGARH.lng })
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].scrapType).toBe("plastic"); // the ~2km one
    expect(res.body.data[0].distanceKm).toBeLessThan(res.body.data[1].distanceKm);
  });

  test("excludes pickups outside the given radiusKm", async () => {
    const res = await request(app)
      .get("/api/pickup/available")
      .query({ lat: CHANDIGARH.lat, lng: CHANDIGARH.lng, radiusKm: 10 })
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].scrapType).toBe("plastic");
    expect(res.body.total).toBe(1);
  });

  test("never returns pickups that are already accepted, even within radius", async () => {
    await Pickup.updateMany({}, { status: "accepted" });

    const res = await request(app)
      .get("/api/pickup/available")
      .query({ lat: CHANDIGARH.lat, lng: CHANDIGARH.lng })
      .set("Authorization", `Bearer ${collectorToken}`);

    expect(res.body.data).toHaveLength(0);
  });

  test("excludes pending pickups whose requester is inactive/deleted, with and without coordinates", async () => {
    await User.updateOne({ email: "requester@example.com" }, { isActive: false });

    const withoutCoords = await request(app)
      .get("/api/pickup/available")
      .set("Authorization", `Bearer ${collectorToken}`);
    expect(withoutCoords.body.data).toHaveLength(0);
    expect(withoutCoords.body.total).toBe(0);

    const withCoords = await request(app)
      .get("/api/pickup/available")
      .query({ lat: CHANDIGARH.lat, lng: CHANDIGARH.lng })
      .set("Authorization", `Bearer ${collectorToken}`);
    expect(withCoords.body.data).toHaveLength(0);
    expect(withCoords.body.total).toBe(0);
  });
});