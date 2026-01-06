const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: { type: String, required: true },
  time: { type: Date, required: true },
  msg: { type: String, required: true },
  // You can add more fields if Pino sends them, like 'pid', 'hostname'
  pid: { type: Number },
  hostname: { type: String }
});

module.exports = mongoose.model('Log', logSchema);