// Usage: node src/scripts/createAdmin.js <username> <password>
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error(
      "Usage: node src/scripts/createAdmin.js <username> <password>",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ username });
  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`Promoted existing user '${username}' to admin`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash, role: "admin" });
    console.log(`Created admin user '${username}'`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
