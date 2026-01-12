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
 * Logs every HTTP request and saves it to MongoDB.
 */
const logMiddleware = (req, res, next) => {
  res.on('finish', async () => {
    try {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`);

      await Log.create({
        level: 'info',
        time: new Date(),
        msg: `${req.method} ${req.originalUrl}`,
        pid: process.pid,
        hostname: os.hostname()
      });
    } catch (err) {
      console.error('Logging failed:', err);
    }
  });

  next();
};

module.exports = { logger, logMiddleware };
