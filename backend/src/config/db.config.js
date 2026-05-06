'use strict';

/**
 * db.config.js
 * ------------
 * Sequelize instance connected to MySQL.
 *
 * Design decisions:
 *  - Single shared instance (singleton) — imported by all models.
 *  - Connection pool configured for a mid-size API workload.
 *  - `timezone: '+00:00'` ensures all timestamps are stored/read as UTC.
 *  - `logging` is disabled in production to avoid log flooding; in
 *    development it routes SQL to Winston so it appears in structured logs.
 *  - `define.underscored: true` maps camelCase JS fields → snake_case DB columns.
 *  - `define.paranoid: true` enables soft-delete (deletedAt) globally.
 */

require('dotenv').config();

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const {
  DB_HOST     = 'localhost',
  DB_PORT     = 3306,
  DB_NAME     = 'ai_pulse_db',
  DB_USER     = 'root',
  DB_PASSWORD = '',
  NODE_ENV    = 'development',
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  dialect: 'mysql',
  host:    DB_HOST,
  port:    Number(DB_PORT),

  // ── Connection pool
  pool: {
    max:     20,   // maximum number of connections in pool
    min:     2,    // minimum connections always kept alive
    acquire: 30000, // ms to wait before throwing "unable to acquire connection"
    idle:    10000, // ms a connection can sit idle before being released
  },

  // ── UTC everywhere
  timezone: '+00:00',

  // ── SQL logging: structured via Winston in dev, silent in production
  logging: NODE_ENV === 'production'
    ? false
    : (sql) => logger.debug({ sql }),

  // ── Global model options applied to every model automatically
  define: {
    underscored:    true,   // JS: createdAt  → DB: created_at
    timestamps:     true,
    paranoid:       true,   // Adds deletedAt; DELETE becomes a soft-delete
    freezeTableName: false, // Sequelize will still pluralise unless overridden per model
  },
});

/**
 * Verify connectivity at startup.
 * Called from app.js — if this rejects, the server should not boot.
 */
const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('✅  MySQL connection established via Sequelize.');
};

module.exports = { sequelize, connectDB };
