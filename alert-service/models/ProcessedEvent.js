const mongoose = require("mongoose");

const processedEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now, expires: 86400 }, // auto-deletes after 24h — no infinite growth
});

module.exports = mongoose.model("ProcessedEvent", processedEventSchema);

