'use strict';

/**
 * auth.controller.js
 * ------------------
 * Handles user registration and login.
 *
 * POST /api/v1/auth/register  → create user, return JWT
 * POST /api/v1/auth/login     → verify credentials, return JWT
 * GET  /api/v1/auth/me        → return current user from JWT (requires auth)
 *
 * JWT signing is delegated to utils/auth.helpers.js to avoid repetition.
 */

const bcrypt               = require('bcryptjs');
const User                 = require('../models/user.model');
const AppError             = require('../errors/AppError');
const { signUserToken, publicUser } = require('../utils/auth.helpers');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Reject duplicate emails (case-insensitive)
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return next(new AppError('An account with that email already exists.', 409));
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'VIEWER',
    });

    return res.status(201).json({
      success: true,
      data: { token: signUserToken(user), user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Override the default scope to include passwordHash for comparison
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    return res.status(200).json({
      success: true,
      data: { token: signUserToken(user), user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return next(new AppError('User not found.', 404));

    return res.status(200).json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
