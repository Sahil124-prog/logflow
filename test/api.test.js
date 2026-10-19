process.env.JWT_SECRET = "test-secret";
process.env.REDIS_URL = process.env.REDIS_TEST_URL || "redis://127.0.0.1:6380";


const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../src/index");

// Separate throwaway DB (docker run ... -p 27018:27017 mongo:6), never the real LogFlow data
const MONGO_TEST_URI =
  process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27018/logflow-test";

jest.setTimeout(30000);   // DB setup can take longer than Jest's 5s default


beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.dropDatabase(); // clean start so "alice" etc. don't already exist
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const register = (username, extra = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({ username, password: "Passw0rd!", ...extra });

describe("auth", () => {
  test("register creates a viewer", async () => {
    const res = await register("alice");
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("viewer");
  });

  test("register ignores a client-supplied admin role (security regression)", async () => {
    const res = await register("mallory", { role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("viewer");
  });

  test("login rejects a wrong password", async () => {
    await register("bob");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "bob", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });
});

describe("authorization", () => {
  test("protected route needs a token", async () => {
    const res = await request(app).get("/api/alerts");
    expect(res.status).toBe(401);
  });

  test("viewer cannot resolve an alert (requireAdmin)", async () => {
    const { body } = await register("carol");
    const res = await request(app)
      .patch(`/api/alerts/${new mongoose.Types.ObjectId()}/resolve`)
      .set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(403);
  });
});

describe("health", () => {
  test("/health is 200 and /ready is 200 when Mongo is connected", async () => {
    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/ready")).status).toBe(200);
  });
});
