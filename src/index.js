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

const deployRoutes = require("./routes/deploys");
const startDashboardConsumer = require("./consumers/dashboardConsumer");

const app = express();
const server = http.createServer(app);
const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");

async function ensureS3Bucket() {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  try {
    await s3.send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET }));
    console.log(`S3 bucket '${process.env.S3_BUCKET}' created`);
  } catch (err) {
    if (
      err.name === "BucketAlreadyOwnedByYou" ||
      err.name === "BucketAlreadyExists"
    ) {
      console.log(`S3 bucket '${process.env.S3_BUCKET}' already exists`);
    } else {
      console.error("S3 bucket creation error:", err.message);
    }
  }
}


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,cache-control,Cache-Control,Pragma,Expires",
  );

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const io = new Server(server, {
  cors: { origin: "*" },
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
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/export", exportRoutes);
app.use("/metrics", metricsRouter);
app.use("/api/deploys", deployRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    ensureS3Bucket();
  })
  .catch((err) => console.error("MongoDB error:", err));

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

startDashboardConsumer(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`LogFlow API running on port ${PORT}`));
