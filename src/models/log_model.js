/*
 * log_model.js
 * This model ensures logs are not just printed to the console,
 * but persisted for long-term analysis,
 * which is crucial for production applications.
 */
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: { type: String, required: true },
  time: { type: Date, required: true },
  msg: { type: String, required: true },

  pid: { type: Number },
  hostname: { type: String },

  // Helpful metadata (optional but useful)
  statusCode: { type: Number },
  responseTimeMs: { type: Number }
});

module.exports = mongoose.model('Log', logSchema);
