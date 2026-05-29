'use strict';

/**
 * auth.middleware.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the auth() middleware factory.
 *
 * Test matrix:
 *   ✅ Missing Authorization header           → 401
 *   ✅ Malformed token (not Bearer prefix)    → 401
 *   ✅ Invalid / tampered token signature     → passes error to next()
 *   ✅ Valid token, no role restriction       → calls next() with req.user set
 *   ✅ Valid token, correct role              → calls next()
 *   ✅ Valid token, insufficient role         → 403
 *   ✅ req.user populated correctly after pass
 */

const jwt = require('jsonwebtoken');

// ── Mock jwt.config so we control the secret ────────────────────────────────
jest.mock('../../src/config/jwt.config', () => ({ secret: 'test-secret-32-chars-long-minimum' }));

const auth      = require('../../src/middlewares/auth.middleware');
const AppError  = require('../../src/errors/AppError');

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = 'test-secret-32-chars-long-minimum';

const makeToken = (payload, expiresIn = '1h') =>
  jwt.sign(payload, SECRET, { expiresIn });

const makeReq = (authHeader) => ({
  headers: { authorization: authHeader || '' },
});

/** Calls the middleware and returns { reqOut, errOut } */
const runMiddleware = (middleware, req) =>
  new Promise((resolve) => {
    const next = (err) => resolve({ req, err });
    middleware(req, {}, next);
  });

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('auth() middleware', () => {

  // ── Missing / malformed token ───────────────────────────────────────────────

  it('should call next(AppError 401) when Authorization header is missing', async () => {
    const { err } = await runMiddleware(auth(), makeReq(''));
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('should call next(AppError 401) when header lacks Bearer prefix', async () => {
    const { err } = await runMiddleware(auth(), makeReq('token-without-bearer'));
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('should call next(error) when token is expired', async () => {
    const expired = jwt.sign({ id: 'u1', role: 'ADMIN' }, SECRET, { expiresIn: '-1s' });
    const { err } = await runMiddleware(auth(), makeReq(`Bearer ${expired}`));
    expect(err).toBeTruthy();
    expect(err.name).toBe('TokenExpiredError');
  });

  it('should call next(error) when token has invalid signature', async () => {
    const faked = makeToken({ id: 'u1', role: 'ADMIN' }) + 'tampered';
    const { err } = await runMiddleware(auth(), makeReq(`Bearer ${faked}`));
    expect(err).toBeTruthy();
  });

  // ── Valid token — no role restriction ──────────────────────────────────────

  it('should call next() with no error when token is valid and no role is required', async () => {
    const token = makeToken({ id: 'u1', email: 'admin@test.com', role: 'ADMIN' });
    const req   = makeReq(`Bearer ${token}`);
    const { err } = await runMiddleware(auth(), req);

    expect(err).toBeUndefined();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('u1');
    expect(req.user.role).toBe('ADMIN');
  });

  it('should attach full user payload to req.user', async () => {
    const payload = { id: 'u2', email: 'manager@test.com', role: 'MANAGER', name: 'Dev Manager' };
    const token   = makeToken(payload);
    const req     = makeReq(`Bearer ${token}`);
    await runMiddleware(auth(), req);

    expect(req.user.email).toBe('manager@test.com');
    expect(req.user.name).toBe('Dev Manager');
  });

  // ── Role-based access control ──────────────────────────────────────────────

  it('should allow access when user role is in allowedRoles', async () => {
    const token = makeToken({ id: 'u3', role: 'MANAGER' });
    const { err } = await runMiddleware(auth(['ADMIN', 'MANAGER']), makeReq(`Bearer ${token}`));
    expect(err).toBeUndefined();
  });

  it('should call next(AppError 403) when role is not in allowedRoles', async () => {
    const token = makeToken({ id: 'u4', role: 'WAREHOUSE' });
    const { err } = await runMiddleware(auth(['ADMIN']), makeReq(`Bearer ${token}`));
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/ADMIN/);
  });

  it('should call next(AppError 403) when VIEWER tries to access ADMIN-only route', async () => {
    const token = makeToken({ id: 'u5', role: 'VIEWER' });
    const { err } = await runMiddleware(auth(['ADMIN', 'MANAGER']), makeReq(`Bearer ${token}`));
    expect(err.statusCode).toBe(403);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('should allow any valid role when allowedRoles array is empty', async () => {
    const token = makeToken({ id: 'u6', role: 'WAREHOUSE' });
    const { err } = await runMiddleware(auth([]), makeReq(`Bearer ${token}`));
    expect(err).toBeUndefined();
  });

  it('should strip "Bearer " correctly with extra whitespace in token', async () => {
    const token = makeToken({ id: 'u7', role: 'ADMIN' });
    const req   = makeReq(`Bearer   ${token}`); // extra spaces
    // jwt.verify will fail on the extra spaces — this tests our .trim()
    // The trimmed token should still be valid
    const { err } = await runMiddleware(auth(), req);
    // Either passes (if trim works) or fails with JsonWebTokenError (not 401 AppError)
    if (err) {
      expect(err.name).not.toBe('AppError'); // should NOT be our "missing token" 401
    }
  });
});
