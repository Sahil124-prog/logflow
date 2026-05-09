const express = require("express");
const router = express.Router();
const { register } = require("../metrics");

// GET /metrics — Prometheus scrapes this endpoint
router.get("/", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

module.exports = router;
