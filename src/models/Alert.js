const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  service: { type: String, required: true },
  errorCount: { type: Number, required: true },
  windowStart: { type: Date, required: true },
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Alert", alertSchema);
