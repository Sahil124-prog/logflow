const express = require("express");
const router = express.Router();
const client = require("prom-client");

// collect default Node.js metrics
client.collectDefaultMetrics();

// custom metrics — Phase 7 will expand these
const logsReceived = new client.Counter({
  name: "logs_received_total",
  help: "Total number of logs received",
  labelNames: ["service", "level"],
});

const activeAlertGauge = new client.Gauge({
  name: "active_alerts_total",
  help: "Number of currently active unresolved alerts",
});

// GET /metrics — Prometheus scrapes this endpoint
router.get("/", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { router, logsReceived, activeAlertGauge };
