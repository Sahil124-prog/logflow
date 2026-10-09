const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  console.log("Lambda triggered with event:", JSON.stringify(event));

  const log = typeof event === "string" ? JSON.parse(event) : event;
  const fileName = `critical-logs/${Date.now()}-${log.service || "unknown"}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: JSON.stringify(log),
      ContentType: "application/json",
    }),
  );

  console.log(`Saved critical log to S3: ${fileName}`);
  return { statusCode: 200, body: "Log archived" };
};
