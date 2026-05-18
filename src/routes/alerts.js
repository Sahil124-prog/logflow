

const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");
const Log = require("../models/Log");
const auth = require("../middleware/auth");
const { activeAlerts } = require("../metrics");

router.get("/", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.patch("/:id/resolve", auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true, resolvedAt: new Date() },
      { new: true },
    );
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    try {
      activeAlerts.dec();
    } catch (e) {}
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post("/trigger-check", auth, async (req, res) => {
  try {
    const WINDOW_MINUTES = 5;
    const ERROR_THRESHOLD = 2;
    const ALERT_COOLDOWN_MS = 30 * 1000;

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const services = await Log.distinct("service");
    const created = [];

    for (const service of services) {
      const existingAlert = await Alert.findOne({
        service,
        resolved: false,
      });

      const recentlyResolvedAlert = await Alert.findOne({
        service,
        resolved: true,
      }).sort({ updatedAt: -1 });

      
      let timeThreshold = windowStart;
      if (
        recentlyResolvedAlert &&
        new Date(recentlyResolvedAlert.updatedAt) > timeThreshold
      ) {
        timeThreshold = new Date(recentlyResolvedAlert.updatedAt);
      }

      const errorCount = await Log.countDocuments({
        service,
        level: "error",
        timestamp: { $gte: timeThreshold },
      });

      if (errorCount >= ERROR_THRESHOLD) {
        if (
          !existingAlert &&
          (!recentlyResolvedAlert ||
            Date.now() - new Date(recentlyResolvedAlert.updatedAt).getTime() >
              ALERT_COOLDOWN_MS)
        ) {
          const alert = await Alert.create({
            service,
            errorCount,
            windowStart,
            resolved: false,
          });
          activeAlerts.inc();
          created.push(alert);

          if (req.io) {
            req.io.emit("new-alert", alert);
          }
        } else if (existingAlert) {
          existingAlert.errorCount = errorCount;
          await existingAlert.save();
          if (req.io) {
            req.io.emit("alert-updated", existingAlert);
          }
        }
      }
    }

    res.json({ triggered: created.length, alerts: created });
  } catch (err) {
    console.error("Trigger check error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;