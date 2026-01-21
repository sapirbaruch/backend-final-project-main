// Logger utility: configures pino and provides middleware for HTTP request logging.
const pino = require('pino');
const os = require('os');
const Log = require('../models/log_model');

// Create a pino logger instance.
// In non-production environments, use pretty printing for readability.
const logger = pino({
  level: 'info',
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty' } }
    : {})
});

/*
 * Logs every HTTP request and persists it in MongoDB.
 *
 * The middleware is intentionally non-blocking:
 * logging to the database is performed asynchronously so that
 * request handling and response times are not affected.
 */
const logMiddleware = (req, res, next) => {
  // Capture the start time of the request to compute response duration.
  const startTime = Date.now();

  // Listen for the response "finish" event to log after the response is sent.
  res.on('finish', () => {
    const responseTimeMs = Date.now() - startTime;

    // Write a concise log entry to stdout using pino.
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${responseTimeMs}ms`);

    // Persist the log entry to MongoDB without blocking the HTTP response.
    Log.create({
      level: 'info',
      time: new Date(),
      msg: `${req.method} ${req.originalUrl}`,
      pid: process.pid,
      hostname: os.hostname(),
      statusCode: res.statusCode,
      responseTimeMs
    }).catch((err) => {
      // Log database write failures to the console without interrupting execution.
      console.error('Failed to write log:', err);
    });
  });

  // Continue processing the request pipeline.
  next();
};

// Export both the raw logger and the middleware for use across services.
module.exports = { logger, logMiddleware };
