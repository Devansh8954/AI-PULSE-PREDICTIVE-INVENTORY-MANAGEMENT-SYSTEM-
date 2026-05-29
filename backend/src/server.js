'use strict';

require('dotenv').config();

const app             = require('./app');
const { connectDB }   = require('./config/db.config');
const logger          = require('./utils/logger');

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    // Verify DB connection before accepting traffic
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`🚀  AI-Pulse API running → http://localhost:${PORT}`);
      logger.info(`📘  Environment          → ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('❌  Failed to connect to database. Server will not start.', err);
    process.exit(1); // eslint-disable-line no-process-exit
  }
};

startServer();
