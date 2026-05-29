'use strict';
/* eslint-disable no-process-exit */

/**
 * seedUsers.js — Developer utility script.
 * Run: node src/scripts/seedUsers.js
 *
 * Inserts / updates all demo user accounts with correct roles and bcrypt hashes.
 * Safe to run multiple times (uses upsert).
 *
 * Credentials for all accounts: Password@123
 */

require('dotenv').config();
const { sequelize } = require('../config/db.config');
require('../models'); // register all models
const User   = require('../models/user.model');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const DEMO_USERS = [
  { id: 'usr00001-0000-0000-0000-000000000001', name: 'Admin User',   email: 'admin@aipulse.com',      role: 'ADMIN'     },
  { id: 'usr00002-0000-0000-0000-000000000002', name: 'Priya Sharma', email: 'manager1@aipulse.com',   role: 'MANAGER'   },
  { id: 'usr00003-0000-0000-0000-000000000003', name: 'Rohan Mehta',  email: 'manager2@aipulse.com',   role: 'MANAGER'   },
  { id: 'usr00004-0000-0000-0000-000000000004', name: 'Ananya Singh', email: 'viewer1@aipulse.com',    role: 'VIEWER'    },
  { id: 'usr00005-0000-0000-0000-000000000005', name: 'Dev Patel',    email: 'warehouse@aipulse.com',  role: 'WAREHOUSE' },
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅  DB connection OK.');

    const hash = bcrypt.hashSync('Password@123', SALT_ROUNDS);
    console.log('🔐  Hash generated. Upserting users...\n');

    for (const u of DEMO_USERS) {
      await User.upsert({ ...u, passwordHash: hash, isActive: true });
      console.log(`  ✅  [${u.role.padEnd(9)}] ${u.email}`);
    }

    console.log('\n✅  All demo users seeded successfully.');
    console.log('   Password for all accounts: Password@123');
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  }
})();
