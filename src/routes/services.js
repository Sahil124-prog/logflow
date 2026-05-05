const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");

// GET /api/services — returns all services with health status
router.get("/", auth, async (req, res) => {
  const services = await Log.distinct("service");

  const result = await Promise.all(
    services.map(async (service) => {
      const recent = await Log.find({ service })
        .sort({ timestamp: -1 })
        .limit(100);

      const errorCount = recent.filter((l) => l.level === "error").length;
      const errorRate = recent.length ? (errorCount / recent.length) * 100 : 0;

      let health = "healthy";
      if (errorRate > 10) health = "degraded";
      if (errorRate > 30) health = "critical";

      return {
        service,
        health,
        errorRate: errorRate.toFixed(1),
        total: recent.length,
      };
    }),
  );

  res.json(result);
});

module.exports = router;
