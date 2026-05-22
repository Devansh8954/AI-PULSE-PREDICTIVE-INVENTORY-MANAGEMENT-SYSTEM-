'use strict';

/**
 * auth.controller.js
 * ------------------
 * Handles user registration and login.
 *
 * POST /api/v1/auth/register  → create user, return token
 * POST /api/v1/auth/login     → verify credentials, return token
 * GET  /api/v1/auth/me        → return current user from JWT (requires auth)
 */

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/user.model');
const AppError = require('../models/errors/AppError');
const jwtCfg   = require('../config/jwt.config');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check duplicate email (case-insensitive)
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

    const token = jwt.sign(
      { sub: user.id, name: user.name, email: user.email, role: user.role },
      jwtCfg.secret,
      { expiresIn: jwtCfg.expiresIn },
    );

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user WITH passwordHash (override defaultScope)
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const token = jwt.sign(
      { sub: user.id, name: user.name, email: user.email, role: user.role },
      jwtCfg.secret,
      { expiresIn: jwtCfg.expiresIn },
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
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

    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
