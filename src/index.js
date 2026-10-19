require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const logRoutes = require("./routes/logs");
const serviceRoutes = require("./routes/services");
const alertRoutes = require("./routes/alerts");
const statsRoutes = require("./routes/stats");
const exportRoutes = require("./routes/exportLogs");
const metricsRouter = require("./routes/metrics");
const { apiRequestDuration } = require("./metrics");
const { isRedisReady } = require("./middleware/rateLimiter");

const deployRoutes = require("./routes/deploys");
const startDashboardConsumer = require("./consumers/dashboardConsumer");

const app = express();

const server = http.createServer(app);
const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:8081,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

const { ensureBucketWithRetry } = require("./s3");

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,cache-control,Cache-Control,Pragma,Expires",
  );

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const io = new Server(server, {
  cors: { origin: allowedOrigins },
});

app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    apiRequestDuration.observe(
      { method: req.method, route: req.path, status_code: res.statusCode },
      duration,
    );
  });
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: isRedisReady() ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res
    .status(mongoOk ? 200 : 503)
    .json({ ready: mongoOk, mongo: mongoOk ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/export", exportRoutes);
app.use("/metrics", metricsRouter);
app.use("/api/deploys", deployRoutes);

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

// Only connect to Mongo/RabbitMQ and listen when run directly (node src/index.js),
// not when a test file require()s this module.
if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected");
      ensureBucketWithRetry(); // not awaited: retries in the background, API keeps serving
    })
    .catch((err) => console.error("MongoDB error:", err));

  startDashboardConsumer(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`LogFlow API running on port ${PORT}`));
}

module.exports = { app, server };
