// const Log = require("../models/Log");
// const Alert = require("../models/Alert");
// const { activeAlerts, servicesOnline } = require("../metrics");

// const WINDOW_MINUTES = 5;
// const ERROR_THRESHOLD = 2;
// const CHECK_INTERVAL = 10 * 1000;

// const runAlertCheck = async (io) => {
//   try {
//     const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
//     const services = await Log.distinct("service");

//     for (const service of services) {
//       const errorCount = await Log.countDocuments({
//         service,
//         level: "error",
//         timestamp: { $gte: windowStart },
//       });

//       const existingAlert = await Alert.findOne({
//         service,
//         resolved: false,
//       });

//       if (errorCount >= ERROR_THRESHOLD) {
//         if (!existingAlert) {
//           const alert = await Alert.create({
//             service,
//             errorCount,
//             windowStart,
//             resolved: false,
//           });

//           activeAlerts.inc();

//           console.log(
//             `Alert created for ${service} — ${errorCount} errors in 5 min`,
//           );

//           if (io) {
//             io.emit("new-alert", alert);
//           }
//         } else {
//           existingAlert.errorCount = errorCount;
//           await existingAlert.save();

//           if (io) {
//             io.emit("alert-updated", existingAlert);
//           }
//         }
//       }
//     }

//     // Update services online gauge
//     const recentServices = await Log.distinct("service", {
//       timestamp: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
//     });
//     servicesOnline.set(recentServices.length);
//   } catch (err) {
//     console.error("Alert worker error:", err);
//   }
// };

// module.exports = (io) => {
//   setInterval(() => runAlertCheck(io), CHECK_INTERVAL);
//   runAlertCheck(io);
//   console.log("Alert worker started");
// };

// const Log = require("../models/Log");
// const Alert = require("../models/Alert");
// const { activeAlerts, servicesOnline } = require("../metrics");

// const WINDOW_MINUTES = 5;
// const ERROR_THRESHOLD = 2;
// const CHECK_INTERVAL = 10 * 1000;

// const runAlertCheck = async (io) => {
//   try {
//     const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

//     const services = await Log.distinct("service");

//     for (const service of services) {
//       const existingAlert = await Alert.findOne({
//         service,
//         resolved: false,
//       });

//       // Find latest resolved alert
//       const latestResolvedAlert = await Alert.findOne({
//         service,
//         resolved: true,
//       }).sort({ updatedAt: -1 });

//       // Count ONLY logs after latest resolve
//       const errorCount = await Log.countDocuments({
//         service,
//         level: "error",
//         timestamp: {
//           $gte: latestResolvedAlert?.updatedAt || windowStart,
//         },
//       });

//       if (errorCount >= ERROR_THRESHOLD) {
//         if (!existingAlert) {
//           const alert = await Alert.create({
//             service,
//             errorCount,
//             windowStart,
//             resolved: false,
//           });

//           activeAlerts.inc();

//           console.log(
//             `Alert created for ${service} — ${errorCount} errors in 5 min`,
//           );

//           if (io) {
//             io.emit("new-alert", alert);
//           }
//         } else {
//           existingAlert.errorCount = errorCount;

//           await existingAlert.save();

//           if (io) {
//             io.emit("alert-updated", existingAlert);
//           }
//         }
//       }
//     }

//     // Update services online gauge
//     const recentServices = await Log.distinct("service", {
//       timestamp: {
//         $gte: new Date(Date.now() - 2 * 60 * 1000),
//       },
//     });

//     servicesOnline.set(recentServices.length);
//   } catch (err) {
//     console.error("Alert worker error:", err);
//   }
// };

// module.exports = (io) => {
//   setInterval(() => runAlertCheck(io), CHECK_INTERVAL);

//   runAlertCheck(io);

//   console.log("Alert worker started");
// };

// const Log = require("../models/Log");
// const Alert = require("../models/Alert");
// const { activeAlerts, servicesOnline } = require("../metrics");

// const WINDOW_MINUTES = 5;
// const ERROR_THRESHOLD = 2;
// const CHECK_INTERVAL = 10 * 1000;
// const ALERT_COOLDOWN_MS = 30 * 1000;

// const runAlertCheck = async (io) => {
//   try {
//     const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
//     const services = await Log.distinct("service");

//     for (const service of services) {
//       // Find active alert
//       const existingAlert = await Alert.findOne({
//         service,
//         resolved: false,
//       });

//       // Find latest resolved alert
//       const recentlyResolvedAlert = await Alert.findOne({
//         service,
//         resolved: true,
//       }).sort({ updatedAt: -1 });

//       // FIX: Establish a time threshold to ignore older, already-resolved errors
//       let timeThreshold = windowStart;
//       if (
//         recentlyResolvedAlert &&
//         new Date(recentlyResolvedAlert.updatedAt) > timeThreshold
//       ) {
//         timeThreshold = new Date(recentlyResolvedAlert.updatedAt);
//       }

//       // Count only errors that happened AFTER the threshold
//       const errorCount = await Log.countDocuments({
//         service,
//         level: "error",
//         timestamp: { $gte: timeThreshold },
//       });

//       if (errorCount >= ERROR_THRESHOLD) {
//         // Create new alert only if:
//         // 1. no active alert exists
//         // 2. cooldown period passed
//         if (
//           !existingAlert &&
//           (!recentlyResolvedAlert ||
//             Date.now() - new Date(recentlyResolvedAlert.updatedAt).getTime() >
//               ALERT_COOLDOWN_MS)
//         ) {
//           const alert = await Alert.create({
//             service,
//             errorCount,
//             windowStart,
//             resolved: false,
//           });

//           activeAlerts.inc();

//           console.log(
//             `Alert created for ${service} — ${errorCount} errors detected`,
//           );

//           if (io) {
//             io.emit("new-alert", alert);
//           }
//         } else if (existingAlert) {
//           // Update existing alert
//           existingAlert.errorCount = errorCount;
//           await existingAlert.save();

//           if (io) {
//             io.emit("alert-updated", existingAlert);
//           }
//         }
//       }
//     }

//     // Update online services metric
//     const recentServices = await Log.distinct("service", {
//       timestamp: {
//         $gte: new Date(Date.now() - 2 * 60 * 1000),
//       },
//     });

//     servicesOnline.set(recentServices.length);
//   } catch (err) {
//     console.error("Alert worker error:", err);
//   }
// };

// module.exports = (io) => {
//   setInterval(() => runAlertCheck(io), CHECK_INTERVAL);
//   runAlertCheck(io);
//   console.log("Alert worker started");
// };

const Log = require("../models/Log");
const Alert = require("../models/Alert");
const { activeAlerts, servicesOnline } = require("../metrics");

const WINDOW_MINUTES = 5;
const ERROR_THRESHOLD = 2;
const CHECK_INTERVAL = 10 * 1000;
const ALERT_COOLDOWN_MS = 30 * 1000;

const runAlertCheck = async (io) => {
  try {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const services = await Log.distinct("service");

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
          console.log(
            `Alert created for ${service} — ${errorCount} errors detected`,
          );

          if (io) {
            io.emit("new-alert", alert);
          }
        } else if (existingAlert) {
          existingAlert.errorCount = errorCount;
          await existingAlert.save();

          if (io) {
            io.emit("alert-updated", existingAlert);
          }
        }
      }
    }

    const recentServices = await Log.distinct("service", {
      timestamp: {
        $gte: new Date(Date.now() - 2 * 60 * 1000),
      },
    });

    servicesOnline.set(recentServices.length);
  } catch (err) {
    console.error("Alert worker error:", err);
  }
};

module.exports = (io) => {
  setInterval(() => runAlertCheck(io), CHECK_INTERVAL);
  runAlertCheck(io);
  console.log("Alert worker started");
};