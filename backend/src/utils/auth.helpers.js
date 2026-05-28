'use strict';

/**
 * auth.helpers.js
 * ---------------
 * Shared utilities for the authentication flow.
 *
 * Centralises the JWT signing logic that was previously copy-pasted
 * in both the register and login controller handlers.
 */

const jwt    = require('jsonwebtoken');
const jwtCfg = require('../config/jwt.config');

/**
 * Builds a signed JWT for a given user record.
 *
 * @param {{ id: string, name: string, email: string, role: string }} user
 * @returns {string} Signed JWT string.
 */
const signUserToken = (user) =>
  jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role },
    jwtCfg.secret,
    { expiresIn: jwtCfg.expiresIn },
  );

/**
 * Returns the safe public projection of a user record (no passwordHash).
 *
 * @param {{ id: string, name: string, email: string, role: string }} user
 * @returns {{ id, name, email, role }}
 */
const publicUser = (user) => ({
  id:    user.id,
  name:  user.name,
  email: user.email,
  role:  user.role,
});

module.exports = { signUserToken, publicUser };
