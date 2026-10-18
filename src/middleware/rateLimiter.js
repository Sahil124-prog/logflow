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

// Factory: rateLimit({ name, limit, windowSec, keyFn }) returns an Express middleware.
// Fixed window counter in Redis; fails open if Redis is down (availability over strictness).
const rateLimit = ({ name, limit, windowSec, keyFn }) => async (req, res, next) => {
  if (!client.isReady) return next();

  const window = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rate:${name}:${keyFn(req)}:${window}`;

  try {
    // MULTI makes INCR + EXPIRE atomic: the key can never be left without a TTL
    const [count] = await client.multi().incr(key).expire(key, windowSec).exec();

    res.set("RateLimit-Limit", String(limit));
    res.set("RateLimit-Remaining", String(Math.max(0, limit - count)));

    if (count > limit) {
      return res.status(429).json({ error: "Too many requests, please try again later" });
    }
    next();
  } catch (err) {
    console.warn("Rate limiter error — skipping:", err.message);
    next();
  }
};

module.exports = rateLimit;
module.exports.isRedisReady = () => client.isReady;



