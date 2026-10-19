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

// At most ONE open (resolved:false) alert per service. Resolved alerts are unlimited.
alertSchema.index({ service: 1 }, { unique: true, partialFilterExpression: { resolved: false } });

module.exports = mongoose.model("Alert", alertSchema);
