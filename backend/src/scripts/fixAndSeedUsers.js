'use strict';
/* eslint-disable no-process-exit */
/**
 * fixAndSeedUsers.js
 * 1. ALTERs users.role ENUM to include WAREHOUSE
 * 2. Inserts all 5 demo users (upsert-safe)
 */
require('dotenv').config();
const { sequelize } = require('../config/db.config');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅  DB connected\n');

    // Step 1: Update ENUM to include WAREHOUSE
    await sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN','MANAGER','WAREHOUSE','VIEWER') NOT NULL DEFAULT 'VIEWER'",
    );
    console.log('✅  ENUM updated: ADMIN | MANAGER | WAREHOUSE | VIEWER\n');

    // Step 2: Insert all demo users
    const hash = bcrypt.hashSync('Password@123', 12);
    const users = [
      { id: 'usr00001-0000-0000-0000-000000000001', name: 'Admin User',   email: 'admin@aipulse.com',      role: 'ADMIN'     },
      { id: 'usr00002-0000-0000-0000-000000000002', name: 'Priya Sharma', email: 'manager1@aipulse.com',   role: 'MANAGER'   },
      { id: 'usr00003-0000-0000-0000-000000000003', name: 'Rohan Mehta',  email: 'manager2@aipulse.com',   role: 'MANAGER'   },
      { id: 'usr00004-0000-0000-0000-000000000004', name: 'Ananya Singh', email: 'viewer1@aipulse.com',    role: 'VIEWER'    },
      { id: 'usr00005-0000-0000-0000-000000000005', name: 'Dev Patel',    email: 'warehouse@aipulse.com',  role: 'WAREHOUSE' },
    ];

    for (const u of users) {
      await sequelize.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE role = VALUES(role), is_active = 1, updated_at = NOW()`,
        { replacements: [u.id, u.name, u.email, hash, u.role], type: QueryTypes.INSERT },
      );
      console.log(`  ✅  [${u.role.padEnd(9)}] ${u.email}`);
    }

    const [row] = await sequelize.query('SELECT COUNT(*) AS c FROM users', { type: QueryTypes.SELECT });
    console.log(`\n✅  Users in DB: ${row.c}`);
    console.log('   Password for all accounts: Password@123');
    process.exit(0);
  } catch (err) {
    console.error('❌  Failed:', err.message);
    process.exit(1);
  }
})();
