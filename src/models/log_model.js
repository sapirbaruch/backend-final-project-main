// src/models/logodel.js
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
