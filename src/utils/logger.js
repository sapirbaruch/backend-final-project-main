const pino = require('pino');
const os = require('os');
const Log = require('../models/log_model');

const logger = pino({
  level: 'info',
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty' } }
    : {})
});

/*
 Logs every HTTP request and persists it in MongoDB.
 This is done in a non-blocking way so the DB cannot slow down the endpoints.
*/
const logMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTimeMs = Date.now() - startTime;

    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${responseTimeMs}ms`);

    // Non-blocking DB write: never delay the HTTP response because of logging
    Log.create({
      level: 'info',
      time: new Date(),
      msg: `${req.method} ${req.originalUrl}`,
      pid: process.pid,
      hostname: os.hostname(),
      statusCode: res.statusCode,
      responseTimeMs
    }).catch((err) => {
      console.error('Failed to write log:', err);
    });
  });

  next();
};

module.exports = { logger, logMiddleware };
