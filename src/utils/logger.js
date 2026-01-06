// src/utils/logger.js
const pino = require('pino');
const Log = require('../models/log-model');

// Create a standard Pino logger
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty' // Optional: makes console logs readable
  }
});

// Middleware to capture every request and save to MongoDB
const logMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  
  // Capture the response finish event
  res.on('finish', async () => {
    try {
      // 1. Log to Console (Pino)
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`);

      // 2. Save to MongoDB (Requirement: "Log message should be written to the database")
      await Log.create({
        level: 'info',
        time: new Date(),
        msg: `${req.method} ${req.originalUrl}`,
        pid: process.pid,
        hostname: require('os').hostname()
      });
    } catch (err) {
      console.error("Logging failed:", err);
    }
  });

  next();
};

module.exports = { logger, logMiddleware };