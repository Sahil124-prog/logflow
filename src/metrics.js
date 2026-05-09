const client = require("prom-client");

// Registry + Default Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Counter: logs received
const logsReceivedTotal = new client.Counter({
  name: "logs_received_total",
  help: "Total number of logs received by the API",
  labelNames: ["service", "level"],
  registers: [register],
});

// Histogram: request duration
const apiRequestDuration = new client.Histogram({
  name: "api_request_duration_seconds",
  help: "Duration of API requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Gauge: active alerts
const activeAlerts = new client.Gauge({
  name: "active_alerts",
  help: "Number of currently active unresolved alerts",
  registers: [register],
});

// Gauge: services online
const servicesOnline = new client.Gauge({
  name: "services_online",
  help: "Number of microservices actively sending logs",
  registers: [register],
});

module.exports = {
  register,
  logsReceivedTotal,
  apiRequestDuration,
  activeAlerts,
  servicesOnline,
};


