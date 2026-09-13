const syncCollectorBadges = require("../src/utils/badgeNotifier");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const Notification = require("../src/models/Notification");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

// notifyUser only needs `io.to(...).emit(...)` — no real socket server
// involved in these tests, so a minimal stub is enough to exercise the
// notification-creation path without standing up Socket.IO.
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

async function makeCompletedPickup(collector, requester) {
  return Pickup.create({
    user: requester._id,
    collector: collector._id,
    scrapType: "metal",
    price: 100,
    status: "completed",
    location: { lat: 12.9, lng: 77.6 },
  });
}

describe("syncCollectorBadges", () => {
  test("notifies for a newly earned badge and records it on the user", async () => {
    const collector = await User.create({
      name: "New Collector",
      email: "sync-new@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "sync-req1@example.com",
      password: "Password123",
      role: "user",
    });
    await makeCompletedPickup(collector, requester);

    await syncCollectorBadges(fakeIo, collector._id);

    const notifications = await Notification.find({ recipient: collector._id, type: "badge_earned" });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].text).toContain("First pickup");

    const updated = await User.findById(collector._id);
    expect(updated.earnedBadgeIds).toEqual(["pickups_1"]);
  });

  test("does not re-notify for a badge already recorded as earned", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "sync-repeat@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "sync-req2@example.com",
      password: "Password123",
      role: "user",
    });
    await makeCompletedPickup(collector, requester);

    await syncCollectorBadges(fakeIo, collector._id);
    // Calling it again with nothing new having happened (still 1 completed
    // pickup) must not create a second notification for the same badge.
    await syncCollectorBadges(fakeIo, collector._id);

    const notifications = await Notification.find({ recipient: collector._id, type: "badge_earned" });
    expect(notifications).toHaveLength(1);
  });

  test("notifies again once a higher milestone tier is newly reached", async () => {
    const collector = await User.create({
      name: "Collector",
      email: "sync-tier@example.com",
      password: "Password123",
      role: "collector",
    });
    const requester = await User.create({
      name: "Requester",
      email: "sync-req3@example.com",
      password: "Password123",
      role: "user",
    });
    await makeCompletedPickup(collector, requester);
    await syncCollectorBadges(fakeIo, collector._id);

    for (let i = 0; i < 9; i++) {
      await makeCompletedPickup(collector, requester);
    }
    await syncCollectorBadges(fakeIo, collector._id);

    const notifications = await Notification.find({ recipient: collector._id, type: "badge_earned" }).sort({
      createdAt: 1,
    });
    expect(notifications).toHaveLength(2);
    expect(notifications[0].text).toContain("First pickup");
    expect(notifications[1].text).toContain("10 pickups");

    const updated = await User.findById(collector._id);
    expect(updated.earnedBadgeIds).toEqual(["pickups_10"]);
  });

  test("is a no-op for a non-collector user", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "sync-noncollector@example.com",
      password: "Password123",
      role: "user",
    });

    await syncCollectorBadges(fakeIo, requester._id);

    const notifications = await Notification.find({ recipient: requester._id });
    expect(notifications).toHaveLength(0);
    const updated = await User.findById(requester._id);
    expect(updated.earnedBadgeIds).toBeUndefined();
  });

  test("is a no-op for a nonexistent user id", async () => {
    const fakeId = "507f1f77bcf86cd799439011";
    await expect(syncCollectorBadges(fakeIo, fakeId)).resolves.not.toThrow();
  });
});