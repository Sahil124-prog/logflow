// Secrets for the test run. Set BEFORE requiring index.js (dotenv won't override them).
process.env.JWT_SECRET = "test-secret";
process.env.INGEST_API_KEY = "test-ingest-key";
process.env.REDIS_URL = process.env.REDIS_TEST_URL || "redis://127.0.0.1:6380";

// Replace RabbitMQ publisher with fakes: no broker needed, and we can assert calls.
jest.mock("../publisher", () => ({
  connectPublisher: jest.fn(),
  publishLogCreated: jest.fn(),
  isPublisherReady: jest.fn(() => true),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { app } = require("../index");
const { publishLogCreated } = require("../publisher");
const Log = require("../models/Log");

const { isRedisReady } = require("../middleware/rateLimiter");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

jest.setTimeout(30000);

const MONGO_TEST_URI =
  process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27018/logflow-ingest-test";

const token = (role) =>
  jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role },
    process.env.JWT_SECRET,
  );

const sample = { service: "auth-service", level: "info", message: "test log" };

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.dropDatabase();
  // Redis client connects asynchronously; wait up to 5 s so the limiter is active
  for (let i = 0; i < 50 && !isRedisReady(); i++) await sleep(100);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(() => jest.clearAllMocks());

describe("POST / — authOrApiKey", () => {
  test("no key and no token -> 401", async () => {
    const res = await request(app).post("/").send(sample);
    expect(res.status).toBe(401);
  });

  test("wrong API key -> 401 (falls through to JWT check)", async () => {
    const res = await request(app)
      .post("/")
      .set("x-api-key", "wrong")
      .send(sample);
    expect(res.status).toBe(401);
  });

  test("valid API key -> 201, saved and published", async () => {
    const res = await request(app)
      .post("/")
      .set("x-api-key", "test-ingest-key")
      .send(sample);
    expect(res.status).toBe(201);
    expect(res.body.service).toBe("auth-service");
    expect(await Log.countDocuments()).toBe(1);
    expect(publishLogCreated).toHaveBeenCalledTimes(1);
  });

  test("valid JWT -> 201", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", `Bearer ${token("viewer")}`)
      .send(sample);
    expect(res.status).toBe(201);
  });

  test("forged JWT -> 403", async () => {
    const forged = jwt.sign({ id: "x", role: "admin" }, "not-the-secret");
    const res = await request(app)
      .post("/")
      .set("Authorization", `Bearer ${forged}`)
      .send(sample);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /cleanup — requireAdmin + retention", () => {
  test("viewer -> 403", async () => {
    const res = await request(app)
      .delete("/cleanup")
      .set("Authorization", `Bearer ${token("viewer")}`);
    expect(res.status).toBe(403);
  });

  test("admin deletes only logs older than retention", async () => {
    await Log.create({
      ...sample,
      message: "old",
      timestamp: new Date("2020-01-01"),
    });
    const before = await Log.countDocuments();

    const res = await request(app)
      .delete("/cleanup")
      .set("Authorization", `Bearer ${token("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1); // only the 2020 log
    expect(await Log.countDocuments()).toBe(before - 1); // recent logs kept
  });
});

describe("rate limiter (Redis fixed window)", () => {
  test("Redis is reachable (otherwise limiter fails open)", () => {
    expect(isRedisReady()).toBe(true);
  });

  test("JWT user: 20 allowed, 21st -> 429; other users unaffected", async () => {
    // Fixed-window edge: if the minute is about to roll over, wait for the new window
    const msLeft = 60000 - (Date.now() % 60000);
    if (msLeft < 3000) await sleep(msLeft + 100);

    const userA = token("viewer");
    for (let i = 1; i <= 20; i++) {
      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${userA}`)
        .send(sample);
      expect(res.status).toBe(201);
      expect(res.headers["ratelimit-limit"]).toBe("20");
      expect(res.headers["ratelimit-remaining"]).toBe(String(20 - i));
    }

    const blocked = await request(app)
      .post("/")
      .set("Authorization", `Bearer ${userA}`)
      .send(sample);
    expect(blocked.status).toBe(429);

    // Keys are per user id, so a different user still gets through
    const userB = token("viewer");
    const ok = await request(app)
      .post("/")
      .set("Authorization", `Bearer ${userB}`)
      .send(sample);
    expect(ok.status).toBe(201);
  });
});
