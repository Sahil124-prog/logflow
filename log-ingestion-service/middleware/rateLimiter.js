const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://redis:6379",
});
client
  .connect()
  .catch((err) =>
    console.warn("Redis not available — rate limiting disabled:", err.message),
  );
client.on("error", (err) => console.warn("Redis error:", err.message));

// Fixed-window limiter; fails open if Redis is down
const rateLimit =
  ({ name, limit, windowSec, keyFn }) =>
  async (req, res, next) => {
    if (!client.isReady) return next();
    const l = typeof limit === "function" ? limit(req) : limit;
    const window = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rate:${name}:${keyFn(req)}:${window}`;
    try {
      const [count] = await client
        .multi()
        .incr(key)
        .expire(key, windowSec)
        .exec();
      res.set("RateLimit-Limit", String(l));
      res.set("RateLimit-Remaining", String(Math.max(0, l - count)));
      if (count > l)
        return res.status(429).json({ error: "Rate limit exceeded" });
      next();
    } catch (err) {
      console.warn("Rate limiter error — skipping:", err.message);
      next();
    }
  };

module.exports = rateLimit;
