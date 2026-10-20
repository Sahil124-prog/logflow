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


// Retry the initial Mongo connection forever (capped backoff: 2s, 4s, 8s, 16s, 30s, 30s...).
// mongoose.connect() alone tries ONCE — if Mongo starts later (K8s, cold boot), the API
// would stay disconnected forever while the process keeps running.
async function connectMongoWithRetry(uri) {
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected");
      return;
    } catch (err) {
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30000);
      console.warn(`MongoDB connect failed (attempt ${attempt}): ${err.message} — retrying in ${delay / 1000}s`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}


// Only connect to Mongo/RabbitMQ and listen when run directly (node src/index.js),
// not when a test file require()s this module.
if (require.main === module) {
  // mongoose
  //   .connect(process.env.MONGO_URI)
  //   .then(() => {
  //     console.log("MongoDB connected");
  //     ensureBucketWithRetry(); // not awaited: retries in the background, API keeps serving
  //   })
  //   .catch((err) => console.error("MongoDB error:", err));

  connectMongoWithRetry(process.env.MONGO_URI).then(() => {
    ensureBucketWithRetry(); // not awaited: retries in the background, API keeps serving
  });

  startDashboardConsumer(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`LogFlow API running on port ${PORT}`));

  // Graceful shutdown: Kubernetes sends SIGTERM, then SIGKILL after 30 s.
  // Stop taking new connections, let in-flight requests finish, close DB, exit 0.
  const shutdown = (signal) => {
    console.log(`[shutdown] ${signal} received — closing gracefully`);
    // Safety net: never hang until Kubernetes has to SIGKILL us
    setTimeout(() => {
      console.error("[shutdown] still busy after 10 s — forcing exit");
      process.exit(1);
    }, 10000).unref();
    // io.close() disconnects Socket.IO clients AND closes the HTTP server;
    // its callback runs once in-flight requests have finished
    io.close(async () => {
      await mongoose.connection.close();
      console.log("[shutdown] clean exit");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C locally
  
}



module.exports = { app, server };
