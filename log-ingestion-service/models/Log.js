const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  service: { type: String, required: true },
  level: { type: String, enum: ["info", "warn", "error"], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
});

logSchema.index({ service: 1, timestamp: -1 });

module.exports = mongoose.model("Log", logSchema);
