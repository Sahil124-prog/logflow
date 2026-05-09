const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const { logsReceivedTotal } = require("../metrics");

router.post("/", rateLimiter, async (req, res) => {
  try {
    console.log("POST HIT");
    console.log(req.body);

    const { service, level, message, timestamp } = req.body;

    const log = await Log.create({
      service,
      level,
      message,
      timestamp: timestamp || Date.now(),
    });

    console.log("Before Metric");

    logsReceivedTotal.inc({
      service,
      level,
    });

    console.log("After Metric");

    req.io.emit("new-log", log);

    res.status(201).json(log);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;
