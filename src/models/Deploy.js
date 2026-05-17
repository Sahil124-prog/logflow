const mongoose = require("mongoose");

const deploySchema = new mongoose.Schema({
  buildNumber: { type: Number, required: true },
  imageTag: { type: String, required: true },
  status: { type: String, default: "success" },
  deployedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Deploy", deploySchema);
