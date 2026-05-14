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
const alertWorker = require("./workers/alertWorker");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Request duration middleware — BEFORE routes
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

// Health endpoint — used by React dashboard SystemHealth component
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/export", exportRoutes);
app.use("/metrics", metricsRouter);

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Socket.io
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

// Start alert worker
alertWorker(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`LogFlow API running on port ${PORT}`));
