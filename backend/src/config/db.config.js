'use strict';

require('dotenv').config();

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const {
  DB_HOST     = 'localhost',
  DB_PORT     = '3306',
  DB_NAME     = 'ai_pulse_db',
  DB_USER     = 'root',
  DB_PASSWORD,
  NODE_ENV    = 'development',
} = process.env;

// Fail fast — never boot without a DB password
if (!DB_PASSWORD) {
  throw new Error('DB_PASSWORD is not set. Add it to your .env file (see .env.example).');
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  dialect:  'mysql',
  host:     DB_HOST,
  port:     Number(DB_PORT),

  // Connection pool — sized for a mid-scale API workload
  pool: { max: 20, min: 2, acquire: 30_000, idle: 10_000 },

  timezone: '+00:00', // store all timestamps as UTC

  // SQL logging: structured via Winston in dev, silent in production
  logging: NODE_ENV === 'production' ? false : (sql) => logger.debug({ sql }),

  define: {
    underscored:     true,  // createdAt → created_at
    timestamps:      true,
    paranoid:        true,  // soft-delete via deletedAt
    freezeTableName: false,
  },
});

/** Verify connectivity at startup. If this rejects, the server should not boot. */
const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('MySQL connection established via Sequelize.');
};

module.exports = { sequelize, connectDB };
