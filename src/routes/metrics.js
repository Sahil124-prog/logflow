const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");
const Log = require("../models/Log");


const { register, activeAlerts, servicesOnline } = require("../metrics"); 

router.get("/", async (req, res) => {
  try {
    
    const unresolvedCount = await Alert.countDocuments({ resolved: false });
    if (activeAlerts) {
      activeAlerts.set(unresolvedCount);
    }

    
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const uniqueServices = await Log.distinct("service", { 
      timestamp: { $gte: fiveMinsAgo } 
    });
    
    if (servicesOnline) {
      servicesOnline.set(uniqueServices.length); 
    }

    
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

module.exports = router;