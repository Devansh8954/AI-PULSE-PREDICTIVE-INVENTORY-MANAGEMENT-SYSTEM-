'use strict';
/* eslint-disable no-process-exit */

/**
 * syncDb.js — Developer utility script.
 * Run: node src/scripts/syncDb.js
 *
 * Syncs Sequelize models to the DB (alter mode — safe for dev, NEVER use in prod).
 * Creates tables if they don't exist; alters columns to match model definitions.
 */

require('dotenv').config();
const { sequelize } = require('../config/db.config');
require('../models'); // registers all models + associations

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅  DB connection OK.');

    // alter: true → updates existing tables to match model (non-destructive)
    await sequelize.sync({ alter: true });
    console.log('✅  All models synced to database.');
    process.exit(0);
  } catch (err) {
    console.error('❌  DB sync failed:', err.message);
    process.exit(1);
  }
})();
