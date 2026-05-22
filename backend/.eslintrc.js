'use strict';

/**
 * .eslintrc.js — ESLint config for AI-Pulse backend
 * Rules align with Node.js best practices and the existing code style.
 */
module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  rules: {
    // ── Potential bugs ──────────────────────────────────────────────────────
    'no-unused-vars':        ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef':              'error',
    'no-unreachable':        'error',
    'no-constant-condition': 'warn',
    'no-duplicate-case':     'error',
    'eqeqeq':                ['error', 'always', { null: 'ignore' }],

    // ── Code style ──────────────────────────────────────────────────────────
    'no-var':                'error',
    'prefer-const':          'warn',
    'no-console':            'off',    // We use Winston; console is OK in scripts
    'semi':                  ['error', 'always'],
    'quotes':                ['warn', 'single', { avoidEscape: true }],
    'comma-dangle':          ['warn', 'always-multiline'],

    // ── Node.js specific ────────────────────────────────────────────────────
    'handle-callback-err':   'warn',
    'no-process-exit':       'warn',
  },
};
