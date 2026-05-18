
const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");


const { logsReceivedTotal } = require("../metrics");


router.get("/", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const logs = await Log.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post("/", async (req, res) => {
  try {
    const { service, level, message, timestamp } = req.body;
    const log = await Log.create({
      service,
      level,
      message,
      timestamp: timestamp || new Date(),
    });

   
    if (logsReceivedTotal) {
      logsReceivedTotal.inc({ level, service });
    }

    if (req.io) {
      req.io.emit("new-log", log);
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete("/cleanup", auth, async (req, res) => {
  try {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "30");
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await Log.deleteMany({ timestamp: { $lt: cutoff } });
    res.json({ deleted: result.deletedCount, cutoff, retentionDays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;