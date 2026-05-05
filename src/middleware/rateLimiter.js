const redis = require("redis");

const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect();

const rateLimiter = async (req, res, next) => {
  const service = req.body.service;
  const key = `rate:${service}:${Math.floor(Date.now() / 60000)}`;

  const count = await client.incr(key);

  if (count === 1) {
    await client.expire(key, 60);
  }

  if (count > 100) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  next();
};

module.exports = rateLimiter;
