const axios = require("axios");

const API = "http://api:5000";

const services = [
  { name: "auth-service", errorRate: 0.15 },
  { name: "payment-service", errorRate: 0.35 },
  { name: "order-service", errorRate: 0.1 },
];

const messages = {
  info: [
    "User login successful",
    "JWT token generated",
    "Request processed successfully",
    "Cache hit — returning cached response",
    "Session refreshed",
    "Health check passed",
    "Database query completed",
  ],
  error: [
    "JWT validation failed — token expired",
    "Database connection timeout after 5000ms",
    "Payment gateway unreachable",
    "Rate limit exceeded upstream service",
    "Invalid credentials provided",
    "Stripe API returned 500",
    "MongoDB write concern timeout",
  ],
  warn: [
    "Slow query detected — 850ms",
    "Memory usage above 80%",
    "Retry attempt 2 of 3",
    "Deprecated API endpoint called",
    "High latency detected on downstream",
    "Connection pool near capacity",
  ],
};

async function sendLog(service, level, message) {
  try {
    await axios.post(
      `${API}/api/logs`,
      { service, level, message, timestamp: new Date().toISOString() },
      { timeout: 3000 },
    );
  } catch (e) {
    // silently fail — API might not be ready yet during startup
  }
}

async function simulate() {
  for (const svc of services) {
    const rand = Math.random();
    let level, msgs;

    if (rand < svc.errorRate) {
      level = "error";
      msgs = messages.error;
    } else if (rand < svc.errorRate + 0.2) {
      level = "warn";
      msgs = messages.warn;
    } else {
      level = "info";
      msgs = messages.info;
    }

    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    await sendLog(svc.name, level, `${msg} [${svc.name}]`);
  }
}

// Wait 20 seconds for API to fully start, then simulate every 8 seconds
console.log("Simulator waiting for API to start...");
setTimeout(() => {
  console.log("Simulator started — sending logs every 8 seconds");
  simulate();
  setInterval(simulate, 8000);
}, 20000);
