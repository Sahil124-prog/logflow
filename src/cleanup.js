require("dotenv").config();
const mongoose = require("mongoose");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Log = require("./models/Log");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function archiveAndClean() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "7");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const oldLogs = await Log.find({ timestamp: { $lt: cutoff } });

  if (oldLogs.length === 0) {
    console.log("No old logs to archive");
    await mongoose.disconnect();
    return;
  }

  const fileName = `archive-${cutoff.toISOString().split("T")[0]}-${Date.now()}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: JSON.stringify(oldLogs),
      ContentType: "application/json",
    }),
  );

  console.log(`Archived ${oldLogs.length} logs to S3 as ${fileName}`);

  const result = await Log.deleteMany({ timestamp: { $lt: cutoff } });
  console.log(`Deleted ${result.deletedCount} logs from MongoDB`);

  await mongoose.disconnect();
}

archiveAndClean().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
