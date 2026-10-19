const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const BUCKET = process.env.S3_BUCKET;

// ONE client for the whole app (it keeps a connection pool) — not one per call
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

let bucketReady = false; // remember success so we don't call S3 on every export

// Idempotent: creating an existing bucket is treated as success
async function ensureBucket() {
  if (bucketReady) return;
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(`[s3] bucket '${BUCKET}' created`);
  } catch (err) {
    if (
      err.name !== "BucketAlreadyOwnedByYou" &&
      err.name !== "BucketAlreadyExists"
    )
      throw err;
  }
  bucketReady = true;
}

// Startup: retry with exponential backoff (2s, 4s, 8s, 16s, 32s) instead of trying once
async function ensureBucketWithRetry(maxAttempts = 6) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ensureBucket();
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(
          `[s3] giving up at startup: ${err.message} — exports will retry on demand`,
        );
        return;
      }
      const delay = 2000 * 2 ** (attempt - 1);
      console.warn(
        `[s3] bucket check failed (${attempt}/${maxAttempts}): ${err.message} — retrying in ${delay / 1000}s`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Upload JSON; if the bucket vanished (LocalStack restarted), recreate it and retry ONCE
async function putJson(key, data) {
  await ensureBucket();
  const upload = () =>
    s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: "application/json",
      }),
    );
  try {
    await upload();
  } catch (err) {
    if (err.name !== "NoSuchBucket") throw err;
    console.warn(
      "[s3] bucket missing (LocalStack restarted?) — recreating and retrying once",
    );
    bucketReady = false;
    await ensureBucket();
    await upload();
  }
}

module.exports = { ensureBucketWithRetry, putJson };
