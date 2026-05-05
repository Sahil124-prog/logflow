const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const Alert = require("../models/Alert");
const auth = require("../middleware/auth");

// GET /api/stats — aggregated dashboard numbers
router.get("/", auth, async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalToday, totalErrors, activeAlerts, services] = await Promise.all([
    Log.countDocuments({ timestamp: { $gte: todayStart } }),
    Log.countDocuments({ timestamp: { $gte: todayStart }, level: "error" }),
    Alert.countDocuments({ resolved: false }),
    Log.distinct("service"),
  ]);

  const errorRate = totalToday
    ? ((totalErrors / totalToday) * 100).toFixed(1)
    : 0;

  res.json({
    totalToday,
    errorRate,
    activeAlerts,
    servicesOnline: services.length,
  });
});

module.exports = router;
