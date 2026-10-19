const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");
const axios = require("axios");

router.get("/", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const logs = await Log.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real totals from MongoDB — the list endpoint above is capped at 200 rows
router.get("/stats", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    // One pass over the collection: { _id: "error", n: 41 }, { _id: "info", n: 950 }, ...

    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "30", 10);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    // Both queries run in parallel
    const [rows, olderThanRetention] = await Promise.all([
      Log.aggregate([{ $group: { _id: "$level", n: { $sum: 1 } } }]),
      Log.countDocuments({ timestamp: { $lt: cutoff } }),
    ]);
    const byLevel = Object.fromEntries(rows.map((r) => [r._id, r.n]));
    const total = rows.reduce((sum, r) => sum + r.n, 0);

    res.json({
      total,
      errors: byLevel.error || 0,
      warnings: byLevel.warn || 0,
      olderThanRetention,
      retentionDays,
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / and DELETE /cleanup moved to log-ingestion-service as of Phase 0.3
// (CQRS-lite split: this service is now read-only against the Log collection)

router.post("/", auth, async (req, res) => {
  try {
    const ingestionUrl =
      process.env.LOG_INGESTION_URL || "http://log-ingestion-service:5001";
    const response = await axios.post(ingestionUrl + "/", req.body, {
      headers: { Authorization: req.headers.authorization },
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

module.exports = router;
