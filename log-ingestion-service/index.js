require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const Log = require("./models/Log");
const auth = require("./middleware/auth");
const { requireAdmin, authOrApiKey } = auth;

const {
  connectPublisher,
  publishLogCreated,
  isPublisherReady,
} = require("./publisher");

const rateLimit = require("./middleware/rateLimiter");

// JWT users: 20/min per user. API-key services: 100/min per service name.
const ingestLimiter = rateLimit({
  name: "ingest",
  windowSec: 60,
  limit: (req) => (req.user ? 20 : 100),
  keyFn: (req) =>
    req.user ? `user:${req.user.id}` : `svc:${req.body?.service || "unknown"}`,
});

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const rabbitOk = isPublisherReady();
  res
    .status(mongoOk && rabbitOk ? 200 : 503)
    .json({ ready: mongoOk && rabbitOk, mongo: mongoOk, rabbitmq: rabbitOk });
});


// Write path — JWT (dashboard) or x-api-key (services).
app.post("/", authOrApiKey, ingestLimiter, async (req, res) => {
  try {
    const { service, level, message, timestamp } = req.body;
    const log = await Log.create({
      service,
      level,
      message,
      timestamp: timestamp || new Date(),
    });

    publishLogCreated(log);

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retention cleanup — still auth-protected, exactly as before
app.delete("/cleanup", auth, requireAdmin, async (req, res) => {
  try {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "30");
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await Log.deleteMany({ timestamp: { $lt: cutoff } });
    res.json({ deleted: result.deletedCount, cutoff, retentionDays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("[log-ingestion-service] MongoDB connected"))
  .catch((err) => console.error("[log-ingestion-service] MongoDB error:", err));

connectPublisher();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`log-ingestion-service running on port ${PORT}`),
);
