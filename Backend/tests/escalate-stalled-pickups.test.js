const { escalateStalledPickups, STALLED_PICKUP_MINUTES } = require("../src/jobs/escalateStalledPickups");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
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

function fakeIo() {
  return { emit: jest.fn(), to: jest.fn(() => ({ emit: jest.fn() })) };
}

// Backdates the *most recent* "accepted" statusHistory entry — not
// createdAt — since that's what the job actually reads (see
// escalateStalledPickups.js for why it can't just be an $elemMatch on
// any "accepted" entry).
async function backdateLastAcceptedEntry(pickupId, minutesAgo) {
  const pickup = await Pickup.findById(pickupId);
  const lastIndex = [...pickup.statusHistory].map((h) => h.status).lastIndexOf("accepted");
  const backdated = new Date(Date.now() - minutesAgo * 60 * 1000);
  await Pickup.collection.updateOne(
    { _id: pickupId },
    { $set: { [`statusHistory.${lastIndex}.changedAt`]: backdated } }
  );
}

async function createAcceptedPickup(acceptedMinutesAgo) {
  const requester = await User.create({
    name: `Requester ${Math.random()}`,
    email: `req${Math.random()}@example.com`,
    password: "Password123",
    role: "user",
  });
  const collector = await User.create({
    name: `Collector ${Math.random()}`,
    email: `col${Math.random()}@example.com`,
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

  await backdateLastAcceptedEntry(pickup._id, acceptedMinutesAgo);
  return { pickupId: pickup._id, requesterId: requester._id, collectorId: collector._id };
}

describe("escalateStalledPickups", () => {
  test(`flags a pickup accepted longer than ${STALLED_PICKUP_MINUTES} minutes ago, with no progress, as stalled`, async () => {
    const { pickupId } = await createAcceptedPickup(STALLED_PICKUP_MINUTES + 5);

    const count = await escalateStalledPickups(fakeIo());
    expect(count).toBe(1);

    const updated = await Pickup.findById(pickupId);
    expect(updated.isStalled).toBe(true);
    expect(updated.stalledAt).toBeTruthy();
  });

  test("does not flag a recently accepted pickup", async () => {
    const { pickupId } = await createAcceptedPickup(5);

    const count = await escalateStalledPickups(fakeIo());
    expect(count).toBe(0);

    const updated = await Pickup.findById(pickupId);
    expect(updated.isStalled).toBe(false);
  });

  test("ignores a pickup that has already moved to in_progress, however old the original acceptance", async () => {
    const { pickupId, collectorId } = await createAcceptedPickup(STALLED_PICKUP_MINUTES + 30);
    await Pickup.findByIdAndUpdate(pickupId, {
      status: "in_progress",
      $push: { statusHistory: { status: "in_progress", changedBy: collectorId } },
    });

    const count = await escalateStalledPickups(fakeIo());
    expect(count).toBe(0);
  });

  test(
    "does not re-flag a pickup that was reported as a no-show and re-accepted by a different " +
      "collector, even though the original acceptance is old",
    async () => {
      const { pickupId, requesterId } = await createAcceptedPickup(STALLED_PICKUP_MINUTES + 20);

      // Simulate reportNoShow's reopening, then a fresh, recent acceptance
      // by a different collector.
      const newCollector = await User.create({
        name: "New Collector",
        email: "newcollector@example.com",
        password: "Password123",
        role: "collector",
      });
      await Pickup.findByIdAndUpdate(pickupId, {
        status: "accepted",
        collector: newCollector._id,
        isStalled: false,
        stalledAt: null,
        $push: { statusHistory: { status: "accepted", changedBy: newCollector._id } },
      });
      // The new "accepted" entry defaults to "now" (Date.now()) — recent,
      // unlike the original one still sitting earlier in the array.

      const count = await escalateStalledPickups(fakeIo());
      expect(count).toBe(0);

      const updated = await Pickup.findById(pickupId);
      expect(updated.isStalled).toBe(false);
      void requesterId; // unused, kept for readability of what this fixture represents
    }
  );

  test("does not re-flag or re-emit for a pickup that's already stalled", async () => {
    const { pickupId } = await createAcceptedPickup(STALLED_PICKUP_MINUTES + 10);
    const io = fakeIo();

    await escalateStalledPickups(io);
    expect(io.emit).toHaveBeenCalledTimes(1);

    const secondCount = await escalateStalledPickups(io);
    expect(secondCount).toBe(0);
    expect(io.emit).toHaveBeenCalledTimes(1);

    const updated = await Pickup.findById(pickupId);
    expect(updated.isStalled).toBe(true);
  });

  test("emits an updatePickup event for each pickup it escalates", async () => {
    await createAcceptedPickup(STALLED_PICKUP_MINUTES + 1);
    await createAcceptedPickup(STALLED_PICKUP_MINUTES + 1);
    const io = fakeIo();

    const count = await escalateStalledPickups(io);

    expect(count).toBe(2);
    expect(io.emit).toHaveBeenCalledTimes(2);
    expect(io.emit).toHaveBeenCalledWith("updatePickup", expect.objectContaining({ isStalled: true }));
  });
});