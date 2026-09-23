const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const logs = await Log.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / and DELETE /cleanup moved to log-ingestion-service as of Phase 0.3
// (CQRS-lite split: this service is now read-only against the Log collection)

module.exports = router;
