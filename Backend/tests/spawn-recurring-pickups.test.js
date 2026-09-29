const { spawnRecurringPickups, remindUpcomingRecurring } = require("../src/jobs/spawnRecurringPickups");
const User = require("../src/models/User");
const Pickup = require("../src/models/Pickup");
const RecurringPickup = require("../src/models/RecurringPickup");
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

async function createRequester() {
  return User.create({
    name: `Requester ${Math.random()}`,
    email: `req${Math.random()}@example.com`,
    password: "Password123",
    role: "user",
  });
}

async function createTemplate(overrides = {}) {
  const requester = overrides.user || (await createRequester());
  return RecurringPickup.create({
    user: requester._id,
    scrapType: "metal",
    estimatedWeightKg: 5,
    contactName: requester.name,
    contactPhone: "9876543210",
    location: { lat: 30.7, lng: 76.7, address: "Test address" },
    frequency: "weekly",
    active: true,
    nextRunAt: new Date(Date.now() - 60 * 1000), // due one minute ago
    ...overrides,
  });
}

describe("spawnRecurringPickups", () => {
  test("spawns a new pending Pickup for a due template", async () => {
    const template = await createTemplate();

    const count = await spawnRecurringPickups(fakeIo());
    expect(count).toBe(1);

    const pickups = await Pickup.find({ user: template.user });
    expect(pickups).toHaveLength(1);
    expect(pickups[0].status).toBe("pending");
    expect(pickups[0].scrapType).toBe("metal");
    expect(pickups[0].contactPhone).toBe("9876543210");
  });

  test("advances nextRunAt by exactly one interval, anchored to the previous schedule not to now", async () => {
    const originalNextRunAt = new Date(Date.now() - 60 * 1000);
    const template = await createTemplate({ nextRunAt: originalNextRunAt, frequency: "weekly" });

    await spawnRecurringPickups(fakeIo());

    const updated = await RecurringPickup.findById(template._id);
    const expected = new Date(originalNextRunAt);
    expected.setDate(expected.getDate() + 7);
    expect(updated.nextRunAt.toISOString()).toBe(expected.toISOString());
  });

  test("sets lastPickupCreatedAt when it spawns", async () => {
    const template = await createTemplate();
    await spawnRecurringPickups(fakeIo());

    const updated = await RecurringPickup.findById(template._id);
    expect(updated.lastPickupCreatedAt).toBeTruthy();
  });

  test("does not spawn from a template that isn't due yet", async () => {
    await createTemplate({ nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }); // due tomorrow

    const count = await spawnRecurringPickups(fakeIo());
    expect(count).toBe(0);
    expect(await Pickup.countDocuments()).toBe(0);
  });

  test("does not spawn from a paused (inactive) template even if it's overdue", async () => {
    await createTemplate({ active: false });

    const count = await spawnRecurringPickups(fakeIo());
    expect(count).toBe(0);
  });

  test("emits a newPickup event for each spawned pickup, reusing the existing live-feed wiring", async () => {
    await createTemplate();
    const io = fakeIo();

    await spawnRecurringPickups(io);

    expect(io.emit).toHaveBeenCalledWith("newPickup", expect.objectContaining({ status: "pending" }));
  });

  test("notifies the requester that their recurring pickup was scheduled", async () => {
    const template = await createTemplate();
    const io = fakeIo();

    await spawnRecurringPickups(io);

    expect(io.to).toHaveBeenCalledWith(`user:${template.user}`);
  });

  test("spawns independently for multiple due templates in one run", async () => {
    await createTemplate();
    await createTemplate();

    const count = await spawnRecurringPickups(fakeIo());
    expect(count).toBe(2);
    expect(await Pickup.countDocuments()).toBe(2);
  });

  test("a template that fell several intervals behind spawns once and lands in the future, not one pickup per run", async () => {
    // Four weeks overdue (e.g. the server was down) on a weekly series.
    const template = await createTemplate({ nextRunAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) });

    expect(await spawnRecurringPickups(fakeIo())).toBe(1);
    expect(await spawnRecurringPickups(fakeIo())).toBe(0); // next hourly run has nothing left to catch up on

    const updated = await RecurringPickup.findById(template._id);
    expect(updated.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    expect(await Pickup.countDocuments()).toBe(1);
  });
});

describe("remindUpcomingRecurring", () => {
  const inHours = (h) => new Date(Date.now() + h * 60 * 60 * 1000);

  test("reminds about a pickup due within 24 hours", async () => {
    const template = await createTemplate({ nextRunAt: inHours(10) });
    const io = fakeIo();

    expect(await remindUpcomingRecurring(io)).toBe(1);
    expect(io.to).toHaveBeenCalledWith(`user:${template.user}`);
  });

  test("does not remind about one that's further out than the lead time", async () => {
    await createTemplate({ nextRunAt: inHours(72) });
    expect(await remindUpcomingRecurring(fakeIo())).toBe(0);
  });

  test("does not remind about a paused template", async () => {
    await createTemplate({ nextRunAt: inHours(10), active: false });
    expect(await remindUpcomingRecurring(fakeIo())).toBe(0);
  });

  test("sends only one reminder per scheduled run, however often the job runs", async () => {
    await createTemplate({ nextRunAt: inHours(10) });
    expect(await remindUpcomingRecurring(fakeIo())).toBe(1);
    expect(await remindUpcomingRecurring(fakeIo())).toBe(0);
    expect(await remindUpcomingRecurring(fakeIo())).toBe(0);
  });

  test("reminds again once the schedule has moved to a new run (e.g. after a skip)", async () => {
    const template = await createTemplate({ nextRunAt: inHours(10) });
    expect(await remindUpcomingRecurring(fakeIo())).toBe(1);

    template.nextRunAt = inHours(12);
    await template.save();

    expect(await remindUpcomingRecurring(fakeIo())).toBe(1);
  });

  test("does not remind about a template that's already overdue — that's the spawn job's business", async () => {
    await createTemplate({ nextRunAt: new Date(Date.now() - 60 * 1000) });
    expect(await remindUpcomingRecurring(fakeIo())).toBe(0);
  });
});