'use strict';

require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PAGINATION_LIMIT: 20,
};
