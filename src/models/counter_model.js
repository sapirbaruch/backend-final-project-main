const mongoose = require('mongoose');

/*
 * Counter Model
 *
 * Used for auto-increment numeric ids.
 * Each document represents a counter for a {model, field} pair.
 */

const counterSchema = new mongoose.Schema({
  model: { type: String, required: true },
  field: { type: String, required: true },
  count: { type: Number, default: 0 }
});

counterSchema.index({ model: 1, field: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);