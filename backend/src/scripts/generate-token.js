#!/usr/bin/env node
/**
 * generate-token.js — Developer utility
 * =======================================
 * Generates a signed JWT for testing API endpoints without a login flow.
 *
 * Usage:
 *   node src/scripts/generate-token.js
 *   node src/scripts/generate-token.js MANAGER
 *   node src/scripts/generate-token.js VIEWER
 *
 * Copy the printed token and use it as:
 *   Authorization: Bearer <token>
 *   (e.g. in Postman or curl)
 */
'use strict';

require('dotenv').config();
const jwt       = require('jsonwebtoken');
const { secret, expiresIn } = require('../config/jwt.config');

const role = process.argv[2] || 'ADMIN';

const payload = {
  id:    'dev-user-00000000-0000-0000-0000-000000000001',
  email: `dev-${role.toLowerCase()}@ai-pulse.local`,
  role,
};

const token = jwt.sign(payload, secret, { expiresIn });

console.log('\n🔑  Development JWT Token');
console.log('─'.repeat(60));
console.log(`Role:    ${role}`);
console.log(`Expires: ${expiresIn}`);
console.log('─'.repeat(60));
console.log(token);
console.log('─'.repeat(60));
console.log('\nUsage in Postman → Authorization → Bearer Token → paste above\n');
