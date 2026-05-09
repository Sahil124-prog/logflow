const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Connect gracefully — don't crash if Redis is offline
client.connect().catch((err) => {
  console.warn("Redis not available — rate limiting disabled:", err.message);
});

client.on("error", (err) => {
  // Suppress repeated Redis errors — don't crash the app
  console.warn("Redis error:", err.message);
});

const rateLimiter = async (req, res, next) => {
  // If Redis isn't ready, skip rate limiting entirely
  if (!client.isReady) {
    return next();
  }

  const service = req.body.service || "unknown";
  const key = `rate:${service}:${Math.floor(Date.now() / 60000)}`;

  try {
    const count = await client.incr(key);

    if (count === 1) {
      await client.expire(key, 60);
    }

    if (count > 100) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    next();
  } catch (err) {
    // If Redis fails mid-request, skip rate limiting
    console.warn("Rate limiter error — skipping:", err.message);
    next();
  }
};

module.exports = rateLimiter;
