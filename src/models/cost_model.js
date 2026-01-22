// Cost model: represents a single cost item stored in the "costs" collection.
const mongoose = require('mongoose');

/*
 * Cost Schema (Project Requirements)
 * - description: String (required)
 * - category: String (required, one of the allowed categories)
 * - userid: Number (required)
 * - sum: Number (stored as BSON Double in MongoDB)
 *
 * Internal fields:
 * - createdAt: Date (defaults to now)
 * - year/month/day: derived from createdAt for monthly reporting
 */
const costSchema = new mongoose.Schema({
  userid: { type: Number, required: true, index: true },

  createdAt: { type: Date, default: Date.now, index: true },

  year: { type: Number, index: true },
  month: { type: Number, index: true },
  day: { type: Number },

  description: { type: String, required: true },

  category: {
    type: String,
    enum: ['food', 'health', 'housing', 'sports', 'education'],
    required: true
  },

  // Mongoose Number -> stored as BSON Double in MongoDB
  sum: { type: Number, required: true, min: 0 }
});

// Pre-save hook: derive year/month/day from createdAt for report generation.
costSchema.pre('save', function (next) {
  const d = new Date(this.createdAt);
  this.year = d.getFullYear();
  this.month = d.getMonth() + 1;
  this.day = d.getDate();
  next();
});

module.exports = mongoose.model('Cost', costSchema);
