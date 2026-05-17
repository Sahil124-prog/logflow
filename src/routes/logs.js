// const express = require("express");
// const router = express.Router();
// const Log = require("../models/Log");
// const auth = require("../middleware/auth");
// const rateLimiter = require("../middleware/rateLimiter");
// const { logsReceivedTotal } = require("../metrics");

// router.post("/", rateLimiter, async (req, res) => {
//   try {
//     console.log("POST HIT");
//     console.log(req.body);

//     const { service, level, message, timestamp } = req.body;

//     const log = await Log.create({
//       service,
//       level,
//       message,
//       timestamp: timestamp || Date.now(),
//     });

//     console.log("Before Metric");

//     logsReceivedTotal.inc({
//       service,
//       level,
//     });

//     console.log("After Metric");

//     req.io.emit("new-log", log);

//     res.status(201).json(log);
//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       error: err.message,
//     });
//   }
// });

// router.get("/", auth, async (req, res) => {
//   const { service, level, search, from, to } = req.query;
//   const query = {};
//   if (service) query.service = service;
//   if (level) query.level = level;
//   if (search) query.message = { $regex: search, $options: "i" };
//   if (from || to) {
//     query.timestamp = {};
//     if (from) query.timestamp.$gte = new Date(from);
//     if (to) query.timestamp.$lte = new Date(to);
//   }
//   res.set("Cache-Control", "no-store");
//   const logs = await Log.find(query).sort({ timestamp: -1 }).limit(500);
//   res.json(logs);
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");
const { logsReceived } = require("../metrics");

// GET /api/logs
router.get("/", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const logs = await Log.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs
router.post("/", async (req, res) => {
  try {
    const { service, level, message, timestamp } = req.body;
    const log = await Log.create({
      service,
      level,
      message,
      timestamp: timestamp || new Date(),
    });

    logsReceived.inc({ level, service });

    if (req.io) {
      req.io.emit("new-log", log);
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/cleanup — manual trigger for CronJob logic (PHASE 4)
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