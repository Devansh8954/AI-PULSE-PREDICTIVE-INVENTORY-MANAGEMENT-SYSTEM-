'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack, sql, ...meta }) => {
  const base  = `[${timestamp}] ${level}: ${sql || message}`;
  const extra = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return stack ? `${base}\n${stack}` : `${base}${extra}`;
});

// Dev: colorized human-readable  |  Prod: structured JSON for log aggregators
const devFmt  = combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), colorize(), logFormat);
const prodFmt = combine(errors({ stack: true }), timestamp(), format.json());

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFmt : devFmt,
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [new transports.File({ filename: 'logs/exceptions.log' })],
});

module.exports = logger;
