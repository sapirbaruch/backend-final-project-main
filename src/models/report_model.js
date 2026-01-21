// Report model: stores aggregated monthly cost reports per user.
const mongoose = require('mongoose');

/*
 * Report Model
 *
 * Represents a cached monthly report stored in the "reports" collection.
 * This model supports the Computed Pattern:
 * reports for past months may be computed once and reused to avoid recomputation.
 */

// Define schema for monthly report documents.
const reportSchema = new mongoose.Schema({
  // Logical user identifier the report belongs to.
  userid: { type: Number, required: true, index: true },

  // Year of the report (e.g., 2024).
  year: { type: Number, required: true, index: true },

  // Month of the report (1–12).
  month: { type: Number, required: true, index: true },

  // Array of cost objects grouped by category, following the required JSON format.
  costs: { type: Array, required: true }
});

// Prevent duplicate reports for the same user, year, and month.
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

// Export Report model for use in report computation and retrieval.
module.exports = mongoose.model('Report', reportSchema);
