const Log = require("../models/Log");
const Alert = require("../models/Alert");
const { activeAlerts, servicesOnline } = require("../metrics");

const WINDOW_MINUTES = 5;
const ERROR_THRESHOLD = 10;
const CHECK_INTERVAL = 60 * 1000;

const runAlertCheck = async () => {
  try {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const services = await Log.distinct("service");

    for (const service of services) {
      const errorCount = await Log.countDocuments({
        service,
        level: "error",
        timestamp: { $gte: windowStart },
      });

      if (errorCount > ERROR_THRESHOLD) {
        const existingAlert = await Alert.findOne({
          service,
          resolved: false,
        });

        if (!existingAlert) {
          await Alert.create({
            service,
            errorCount,
            windowStart,
            resolved: false,
          });
          activeAlerts.inc();
          console.log(
            `Alert created for ${service} — ${errorCount} errors in 5 min`,
          );
        }
      }
    }

    // Update services online gauge
    const recentServices = await Log.distinct("service", {
      timestamp: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
    });
    servicesOnline.set(recentServices.length);
  } catch (err) {
    console.error("Alert worker error:", err);
  }
};

module.exports = () => {
  setInterval(runAlertCheck, CHECK_INTERVAL);
  console.log("Alert worker started");
};
