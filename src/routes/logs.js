const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");

// POST /api/logs — ingest a new log
router.post("/", rateLimiter, async (req, res) => {
  const { service, level, message, timestamp } = req.body;

  const log = await Log.create({
    service,
    level,
    message,
    timestamp: timestamp || Date.now(),
  });

  // emit to all connected dashboard clients via Socket.io
  req.io.emit("new-log", log);

  res.status(201).json(log);
});

// GET /api/logs — query logs with filters
router.get("/", auth, async (req, res) => {
  const { service, level, search, from, to } = req.query;

  const query = {};
  if (service) query.service = service;
  if (level) query.level = level;
  if (search) query.message = { $regex: search, $options: "i" };
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const logs = await Log.find(query).sort({ timestamp: -1 }).limit(500);

  res.json(logs);
});

module.exports = router;
