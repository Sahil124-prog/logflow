const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");
const auth = require("../middleware/auth");

// GET /api/alerts — returns all unresolved alerts
router.get("/", auth, async (req, res) => {
  const alerts = await Alert.find({ resolved: false }).sort({ createdAt: -1 });

  res.json(alerts);
});

module.exports = router;
