'use strict';

require('dotenv').config();

module.exports = {
  secret:    process.env.JWT_SECRET     || 'changeme_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};
