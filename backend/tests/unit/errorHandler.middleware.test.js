'use strict';

/**
 * errorHandler.middleware.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the global Express error handler middleware.
 *
 * Test matrix:
 *   ✅ AppError (operational) → returns correct statusCode + message
 *   ✅ NotFoundError          → returns 404
 *   ✅ ConcurrentUpdateError  → returns 409
 *   ✅ JWT TokenExpiredError  → maps to 401
 *   ✅ JWT JsonWebTokenError  → maps to 401
 *   ✅ Unhandled error in prod → returns generic 500, hides details
 *   ✅ Unhandled error in dev  → returns full error details
 *   ✅ Response shape always has { success, statusCode, error } structure
 */

// ── Mock logger to suppress console output during tests ────────────────────
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn:  jest.fn(),
  info:  jest.fn(),
}));

const errorHandler      = require('../../src/middlewares/errorHandler.middleware');
const AppError          = require('../../src/models/errors/AppError');
const NotFoundError     = require('../../src/models/errors/NotFoundError');
const ConcurrentUpdateError = require('../../src/models/errors/ConcurrentUpdateError');

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRes = () => {
  const res = { _status: null, _body: null };
  res.status = jest.fn().mockImplementation((code) => { res._status = code; return res; });
  res.json   = jest.fn().mockImplementation((body)  => { res._body  = body;  return res; });
  return res;
};

const runHandler = (err, nodeEnv = 'test') => {
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  const res = makeRes();
  errorHandler(err, {}, res, jest.fn());
  process.env.NODE_ENV = origEnv;
  return res;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('errorHandler middleware', () => {

  // ── Operational errors ────────────────────────────────────────────────────

  it('should return the AppError statusCode and message', () => {
    const err = new AppError('Product not valid', 422);
    const res = runHandler(err);

    expect(res._status).toBe(422);
    expect(res._body.success).toBe(false);
    expect(res._body.error.message).toBe('Product not valid');
    expect(res._body.error.code).toBe('AppError');
  });

  it('should return 404 for NotFoundError', () => {
    const err = new NotFoundError('Inventory record X not found.');
    const res = runHandler(err);

    expect(res._status).toBe(404);
    expect(res._body.error.message).toMatch(/not found/i);
  });

  it('should return 409 for ConcurrentUpdateError', () => {
    const err = new ConcurrentUpdateError('inv-001', 3, 'stock removal');
    const res = runHandler(err);

    expect(res._status).toBe(409);
    expect(res._body.error.code).toBe('ConcurrentUpdateError');
  });

  // ── JWT errors ────────────────────────────────────────────────────────────

  it('should return 401 for TokenExpiredError', () => {
    const err = { name: 'TokenExpiredError', message: 'jwt expired' };
    const res = runHandler(err);

    expect(res._status).toBe(401);
    expect(res._body.error.message).toMatch(/expired/i);
  });

  it('should return 401 for JsonWebTokenError', () => {
    const err = { name: 'JsonWebTokenError', message: 'invalid signature' };
    const res = runHandler(err);

    expect(res._status).toBe(401);
  });

  // ── Unknown / programming errors ─────────────────────────────────────────

  it('should return 500 and hide details in production for unknown errors', () => {
    const err = new Error('secret crash');
    const res = runHandler(err, 'production');

    expect(res._status).toBe(500);
    expect(res._body.error.message).toBe('An unexpected error occurred. Please try again later.');
  });

  it('should return 500 with generic message in development for unknown errors', () => {
    const err = new Error('Detailed crash info');
    const res = runHandler(err, 'development');

    expect(res._status).toBe(500);
    // In dev, message is still generic but stack is included
    expect(res._body.error.message).toBe('An unexpected error occurred. Please try again later.');
    expect(res._body.error.stack).toBeDefined();
  });

  // ── Response shape ────────────────────────────────────────────────────────

  it('every error response should have { success: false, error } shape', () => {
    const res = runHandler(new AppError('Bad input', 400));

    expect(res._body).toHaveProperty('success', false);
    expect(res._body).toHaveProperty('error');
    expect(res._body.error).toHaveProperty('message');
    expect(res._body.error).toHaveProperty('code');
  });

  it('should never expose stack traces in production', () => {
    const err = new Error('secret crash');
    const res = runHandler(err, 'production');

    const bodyStr = JSON.stringify(res._body);
    expect(bodyStr).not.toContain('at Object.');
    expect(bodyStr).not.toContain('secret crash');
  });
});
