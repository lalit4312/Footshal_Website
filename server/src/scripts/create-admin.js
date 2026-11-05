require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/database');
const User = require('../models/User');

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !MONGODB_URI) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and MONGODB_URI before running');
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  await connectDatabase(MONGODB_URI);
  const existing = await User.countDocuments();
  if (existing > 0) throw new Error('An account already exists; use the authenticated user-management API');
  const user = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    role: 'Super Admin',
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12)
  });
  console.log(`Created Super Admin account ${user.email}`);
  await require('mongoose').disconnect();
}

createAdmin().catch(async (error) => {
  console.error(error.message);
  await require('mongoose').disconnect();
  process.exitCode = 1;
});
