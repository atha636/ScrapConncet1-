const { escalateStalePickups, STALE_PICKUP_MINUTES } = require("../src/jobs/escalateStalePickups");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

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

// A stub io — the job only needs .emit to exist, it doesn't need a real
// socket server to verify the escalation logic itself.
function fakeIo() {
  return { emit: jest.fn() };
}

async function createPendingPickup(ageMinutes) {
  const requester = await User.create({
    name: `Requester ${Math.random()}`,
    email: `req${Math.random()}@example.com`,
    password: "Password123",
    role: "user",
  });

  const pickup = await Pickup.create({
    user: requester._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    location: { lat: 30.7, lng: 76.7, address: "Test" },
    price: 100,
    statusHistory: [{ status: "pending", changedBy: requester._id }],
  });

  // Model.updateOne() goes through Mongoose's schema casting, which treats
  // createdAt as immutable once `timestamps: true` is set — the update
  // would silently no-op. Going through the raw collection driver bypasses
  // that guard, which is exactly what we need to simulate an old pickup.
  const backdated = new Date(Date.now() - ageMinutes * 60 * 1000);
  await Pickup.collection.updateOne({ _id: pickup._id }, { $set: { createdAt: backdated } });

  return pickup._id;
}

describe("escalateStalePickups", () => {
  test(`flags a pickup pending longer than ${STALE_PICKUP_MINUTES} minutes as urgent`, async () => {
    const id = await createPendingPickup(STALE_PICKUP_MINUTES + 5);

    const count = await escalateStalePickups(fakeIo());
    expect(count).toBe(1);

    const updated = await Pickup.findById(id);
    expect(updated.isUrgent).toBe(true);
    expect(updated.urgentAt).toBeTruthy();
  });

  test("does not flag a recently created pending pickup", async () => {
    const id = await createPendingPickup(2);

    const count = await escalateStalePickups(fakeIo());
    expect(count).toBe(0);

    const updated = await Pickup.findById(id);
    expect(updated.isUrgent).toBe(false);
  });

  test("does not re-flag or re-emit for a pickup that's already urgent", async () => {
    const id = await createPendingPickup(STALE_PICKUP_MINUTES + 10);
    const io = fakeIo();

    await escalateStalePickups(io);
    expect(io.emit).toHaveBeenCalledTimes(1);

    const secondCount = await escalateStalePickups(io);
    expect(secondCount).toBe(0);
    expect(io.emit).toHaveBeenCalledTimes(1); // still just the one call from before

    const updated = await Pickup.findById(id);
    expect(updated.isUrgent).toBe(true);
  });

  test("ignores pickups that are no longer pending, however old", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "req-nonpending@example.com",
      password: "Password123",
      role: "user",
    });
    const collector = await User.create({
      name: "Collector",
      email: "collector-nonpending@example.com",
      password: "Password123",
      role: "collector",
    });

    const pickup = await Pickup.create({
      user: requester._id,
      collector: collector._id,
      scrapType: "metal",
      estimatedWeightKg: 5,
      location: { lat: 30.7, lng: 76.7, address: "Test" },
      price: 100,
      status: "accepted",
      statusHistory: [
        { status: "pending", changedBy: requester._id },
        { status: "accepted", changedBy: collector._id },
      ],
    });
    await Pickup.collection.updateOne(
      { _id: pickup._id },
      { $set: { createdAt: new Date(Date.now() - (STALE_PICKUP_MINUTES + 30) * 60 * 1000) } }
    );

    const count = await escalateStalePickups(fakeIo());
    expect(count).toBe(0);
  });

  test("emits an updatePickup event for each pickup it escalates", async () => {
    await createPendingPickup(STALE_PICKUP_MINUTES + 1);
    await createPendingPickup(STALE_PICKUP_MINUTES + 1);
    const io = fakeIo();

    const count = await escalateStalePickups(io);

    expect(count).toBe(2);
    expect(io.emit).toHaveBeenCalledTimes(2);
    expect(io.emit).toHaveBeenCalledWith("updatePickup", expect.objectContaining({ isUrgent: true }));
  });
});