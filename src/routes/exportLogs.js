const express = require("express");
const router = express.Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Log = require("../models/Log");
const auth = require("../middleware/auth");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// POST /api/export — export last 1000 logs to S3
router.post("/", auth, async (req, res) => {
  const logs = await Log.find().sort({ timestamp: -1 }).limit(1000);

  const fileName = `logs-export-${Date.now()}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: JSON.stringify(logs),
      ContentType: "application/json",
    }),
  );

  res.json({ message: "Export successful", file: fileName });
});

module.exports = router;
