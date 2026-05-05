const axios = require("axios");

const SERVICE_NAME = "auth-service";
const API_URL = process.env.API_URL || "http://localhost:5000";

const messages = {
  info: ["user login successful", "session refreshed", "token validated"],
  warn: [
    "multiple login attempts",
    "session expiring soon",
    "unusual login location",
  ],
  error: [
    "failed login attempt",
    "token verification failed",
    "database connection lost",
  ],
};

const sendLog = async () => {
  const levels = ["info", "info", "info", "warn", "error"];
  const level = levels[Math.floor(Math.random() * levels.length)];
  const msgList = messages[level];
  const message = msgList[Math.floor(Math.random() * msgList.length)];

  try {
    await axios.post(`${API_URL}/api/logs`, {
      service: SERVICE_NAME,
      level,
      message,
      timestamp: new Date(),
    });
    console.log(`[${SERVICE_NAME}] sent ${level}: ${message}`);
  } catch (err) {
    console.error(`[${SERVICE_NAME}] failed to send log:`, err.message);
  }
};

// send a log every 10-15 seconds
const randomInterval = () => Math.floor(Math.random() * 5000) + 10000;
const schedule = () =>
  setTimeout(() => {
    sendLog();
    schedule();
  }, randomInterval());
schedule();
