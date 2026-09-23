require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const Log = require("./models/Log");
const auth = require("./middleware/auth");
const { connectPublisher, publishLogCreated } = require("./publisher");

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

// Write path — no auth, same as before (simulator/services post here directly)
app.post("/", async (req, res) => {
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
app.delete("/cleanup", auth, async (req, res) => {
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
