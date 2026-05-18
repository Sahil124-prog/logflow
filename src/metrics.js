const client = require("prom-client");


const register = new client.Registry();
client.collectDefaultMetrics({ register });


const logsReceivedTotal = new client.Counter({
  name: "logs_received_total",
  help: "Total number of logs received by the API",
  labelNames: ["service", "level"],
  registers: [register],
});


const apiRequestDuration = new client.Histogram({
  name: "api_request_duration_seconds",
  help: "Duration of API requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});


const activeAlerts = new client.Gauge({
  name: "active_alerts",
  help: "Number of currently active unresolved alerts",
  registers: [register],
});


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


