const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    service: { type: String, required: true },
    errorCount: { type: Number, required: true },
    windowStart: { type: Date, required: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Alert", alertSchema);
