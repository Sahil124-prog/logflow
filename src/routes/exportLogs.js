const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");
const { requireAdmin } = auth;
const { putJson } = require("../s3");

router.post("/", auth, requireAdmin, async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(1000).lean();
    const fileName = `logs-export-${Date.now()}.json`;
    await putJson(fileName, logs);
    console.log(
      `[export] ${logs.length} logs -> s3://${process.env.S3_BUCKET}/${fileName}`,
    );
    res.json({
      message: "Export successful",
      file: fileName,
      count: logs.length,
    });
  } catch (err) {
    // Never let an async error escape Express 4 — on Node 22 it kills the process
    console.error("[export] failed:", err.name, err.message);
    res.status(502).json({ error: "Export to S3 failed", detail: err.message });
  }
});

module.exports = router;
