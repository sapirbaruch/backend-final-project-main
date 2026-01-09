const mongoose = require('mongoose');

/*
 * Report Model
 *
 * Stores monthly reports in the "reports" collection.
 * Used by the Computed Pattern: reports may be cached for past months.
 */

const reportSchema = new mongoose.Schema({
  userid: { type: Number, required: true, index: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true },

  // Array of objects grouped by category (as required by the project JSON format)
  costs: { type: Array, required: true }
});

// Prevent duplicates of same user/year/month
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
