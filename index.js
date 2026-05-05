require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const redis = require("redis");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const logRoutes = require("./routes/logs");
const serviceRoutes = require("./routes/services");
const alertRoutes = require("./routes/alerts");
const statsRoutes = require("./routes/stats");
const exportRoutes = require("./routes/exportLogs");
const metricsRoutes = require("./routes/metrics");

const alertWorker = require("./workers/alertWorker");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());

// attach io to every request so routes can emit
app.use((req, res, next) => {
  req.io = io;
  next();
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/export", exportRoutes);
app.use("/metrics", metricsRoutes);

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

// start alert worker
alertWorker();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`LogFlow API running on port ${PORT}`));
