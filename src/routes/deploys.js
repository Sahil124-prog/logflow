const express = require("express");
const router = express.Router();
const Deploy = require("../models/Deploy");
const auth = require("../middleware/auth");

// GET /api/deploys
router.get("/", auth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const deploys = await Deploy.find().sort({ deployedAt: -1 }).limit(10);
    res.json(deploys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deploys — called by Jenkins webhook (or our seed button)
router.post("/", async (req, res) => {
  try {
    const { buildNumber, imageTag, status } = req.body;
    const deploy = await Deploy.create({
      buildNumber,
      imageTag,
      status: status || "success",
    });
    res.json(deploy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
