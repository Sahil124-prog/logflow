// No RabbitMQ in tests: fake publisher so we can assert which events were sent.
jest.mock("../publisher", () => ({
  connectPublisher: jest.fn(),
  publishEvent: jest.fn(),
}));

const mongoose = require("mongoose");
const { checkThreshold, ERROR_THRESHOLD } = require("../index");
const { publishEvent } = require("../publisher");
const Log = require("../models/Log");
const Alert = require("../models/Alert");

jest.setTimeout(30000);

const MONGO_TEST_URI =
  process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27018/logflow-alert-test";

const SVC = "payment-service";

// Insert n error logs, `agoMs` milliseconds in the past
const addErrors = (n, agoMs = 0) =>
  Log.insertMany(
    Array.from({ length: n }, () => ({
      service: SVC,
      level: "error",
      message: "boom",
      timestamp: new Date(Date.now() - agoMs),
    })),
  );

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.dropDatabase();
  await Alert.syncIndexes(); // make sure schema indexes exist (matters in 13c)
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Log.deleteMany({});
  await Alert.deleteMany({});
  jest.clearAllMocks();
});

describe("checkThreshold", () => {
  test("threshold is 2 errors", () => {
    expect(ERROR_THRESHOLD).toBe(2);
  });

  test("1 error -> no alert", async () => {
    await addErrors(1);
    await checkThreshold(SVC);
    expect(await Alert.countDocuments()).toBe(0);
    expect(publishEvent).not.toHaveBeenCalled();
  });

  test("2 errors -> one alert created and published", async () => {
    await addErrors(2);
    await checkThreshold(SVC);
    const alerts = await Alert.find();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].errorCount).toBe(2);
    expect(publishEvent).toHaveBeenCalledWith(
      "alert.created",
      expect.anything(),
    );
  });

  test("errors older than the 5-min window don't count", async () => {
    await addErrors(5, 10 * 60 * 1000); // 10 minutes ago
    await checkThreshold(SVC);
    expect(await Alert.countDocuments()).toBe(0);
  });

  test("open alert + more errors -> same alert updated, not a new one", async () => {
    await addErrors(2);
    await checkThreshold(SVC);
    await addErrors(1);
    await checkThreshold(SVC);
    const alerts = await Alert.find();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].errorCount).toBe(3);
    expect(publishEvent).toHaveBeenLastCalledWith(
      "alert.updated",
      expect.anything(),
    );
  });

  test("cooldown: resolved <30s ago -> no new alert", async () => {
    await Alert.create({
      service: SVC,
      errorCount: 2,
      windowStart: new Date(),
      resolved: true,
    });
    await addErrors(2); // after the resolve
    await checkThreshold(SVC);
    expect(await Alert.countDocuments({ resolved: false })).toBe(0);
  });

  test("after cooldown: resolved 60s ago + new errors -> new alert", async () => {
    // insert directly so mongoose doesn't overwrite updatedAt with "now"
    const past = new Date(Date.now() - 60000);
    await Alert.collection.insertOne({
      service: SVC,
      errorCount: 2,
      windowStart: past,
      resolved: true,
      createdAt: past,
      updatedAt: past,
    });
    await addErrors(2);
    await checkThreshold(SVC);
    expect(await Alert.countDocuments({ resolved: false })).toBe(1);
  });

  test("RACE: 5 parallel checks -> still exactly ONE open alert", async () => {
    await addErrors(2);
    // simulates RabbitMQ delivering 5 error events at once (no prefetch)
    await Promise.allSettled(
      Array.from({ length: 5 }, () => checkThreshold(SVC)),
    );
    expect(await Alert.countDocuments({ resolved: false })).toBe(1);
  });
});
