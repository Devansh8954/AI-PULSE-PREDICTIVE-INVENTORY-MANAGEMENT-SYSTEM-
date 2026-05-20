'use strict';

require('dotenv').config();

const secret = process.env.JWT_SECRET;

// ── Fail fast: a weak or missing JWT secret is a security vulnerability ──────
if (!secret || secret.length < 32) {
  throw new Error(
    '❌  JWT_SECRET is missing or too short (< 32 chars). ' +
    'Set a strong secret in your .env file (see .env.example).\n' +
    '   Generate one: node -e "require(\'crypto\').randomBytes(64).toString(\'hex\')"'
  );
}

module.exports = {
  secret,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};
