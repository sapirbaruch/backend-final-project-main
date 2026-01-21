/*
 * log_model.js
 *
 * Log model used to persist HTTP request and application logs in MongoDB.
 * Storing logs in the database (instead of console-only logging) enables
 * long-term analysis, debugging, and monitoring in production environments.
 */
const mongoose = require('mongoose');

// Define schema for log entries stored by the logging middleware.
const logSchema = new mongoose.Schema({
  // Log severity level (e.g., info, warn, error).
  level: { type: String, required: true },

  // Timestamp of when the log entry was created.
  time: { type: Date, required: true },

  // Human-readable log message.
  msg: { type: String, required: true },

  // Process ID and hostname help identify the running instance.
  pid: { type: Number },
  hostname: { type: String },

  // Optional HTTP-related metadata for request/response diagnostics.
  statusCode: { type: Number },
  responseTimeMs: { type: Number }
});

// Export Log model for use by the logging middleware and logs service.
module.exports = mongoose.model('Log', logSchema);
