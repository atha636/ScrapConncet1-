const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const assertCanShareLocation = require("../src/utils/assertCanShareLocation");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

beforeAll(async () => {
  await connect();
}, 60000);

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

async function makePickup(requester, collector, status) {
  return Pickup.create({
    user: requester._id,
    collector: collector ? collector._id : undefined,
    scrapType: "metal",
    price: 100,
    status,
    location: { lat: 12.9, lng: 77.6 },
  });
}

describe("assertCanShareLocation", () => {
  test("allows the assigned collector on an accepted pickup", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req1@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "loc-col1@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, "accepted");

    await expect(assertCanShareLocation(pickup._id, collector._id)).resolves.toBeTruthy();
  });

  test("allows the assigned collector on an in_progress pickup", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req2@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "loc-col2@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, "in_progress");

    await expect(assertCanShareLocation(pickup._id, collector._id)).resolves.toBeTruthy();
  });

  test("rejects the requester, even for their own pickup", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req3@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "loc-col3@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, "accepted");

    await expect(assertCanShareLocation(pickup._id, requester._id)).rejects.toThrow();
  });

  test("rejects a completely unrelated user", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req4@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "loc-col4@example.com",
      password: "Password123",
      role: "collector",
    });
    const stranger = await User.create({
      name: "Stranger",
      email: "loc-stranger@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, "accepted");

    await expect(assertCanShareLocation(pickup._id, stranger._id)).rejects.toThrow();
  });

  test("rejects a pending pickup — no collector assigned yet", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req5@example.com",
      password: "Password123",
      role: "user",
    });
    const pickup = await makePickup(requester, null, "pending");

    await expect(assertCanShareLocation(pickup._id, requester._id)).rejects.toThrow();
  });

  test("rejects a completed pickup — nothing left to drive toward", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req6@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "loc-col6@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, "completed");

    await expect(assertCanShareLocation(pickup._id, collector._id)).rejects.toThrow();
  });

  test("rejects a cancelled pickup", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "loc-req7@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "loc-col7@example.com",
      password: "Password123",
      role: "collector",
    });
    const pickup = await makePickup(requester, collector, "cancelled");

    await expect(assertCanShareLocation(pickup._id, collector._id)).rejects.toThrow();
  });

  test("rejects a nonexistent pickup id", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "loc-col8@example.com",
      password: "Password123",
      role: "collector",
    });
    await expect(
      assertCanShareLocation("507f1f77bcf86cd799439011", collector._id)
    ).rejects.toThrow();
  });
});