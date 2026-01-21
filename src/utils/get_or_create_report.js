// Utility function: computes or retrieves a monthly cost report for a user.
const Report = require('../models/report_model');
const Cost = require('../models/cost_model');

/*
 * Computed Design Pattern (Project Requirement)
 *
 * The monthly report is computed on demand from the "costs" collection:
 * 1) If a report already exists in the "reports" collection, return it.
 * 2) Otherwise, compute it by grouping cost items by category and mapping each
 *    item to { sum, description, day }.
 *
 * To reduce recomputation, the server caches reports ONLY for past months,
 * because the server does not allow adding costs with dates in the past.
 */

async function getOrCreateReport(userId, year, month) {
  // Coerce input values to numbers to avoid string/number mismatches.
  const uid = Number(userId);
  const y = Number(year);
  const m = Number(month);

  // Validate input parameters before querying the database.
  if (isNaN(uid) || isNaN(y) || isNaN(m)) {
    throw new Error('Invalid report parameters');
  }

  // Attempt to retrieve a cached report for the given user, year, and month.
  let report = await Report.findOne({ userid: uid, year: y, month: m });

  // If no cached report exists, compute it from the costs collection.
  if (!report) {
    // Retrieve all cost items for the specified user and month.
    const costs = await Cost.find({ userid: uid, year: y, month: m });

    // List of allowed categories as defined by the project requirements.
    const categories = ['food', 'health', 'housing', 'sports', 'education'];

    // Build the required JSON structure: an array of category-based cost objects.
    const formattedCosts = categories.map((cat) => ({
      [cat]: costs
        .filter((c) => c.category === cat)
        .map((c) => ({
          sum: c.sum,
          description: c.description,
          day: c.day
        }))
    }));

    // Create a new report instance with the computed data.
    report = new Report({
      userid: uid,
      year: y,
      month: m,
      costs: formattedCosts
    });

    // Determine whether the requested report refers to a past month.
    const now = new Date();
    const isPastMonth =
      (y < now.getFullYear()) ||
      (y === now.getFullYear() && m < (now.getMonth() + 1));

    // Cache the report only if it refers to a past month.
    if (isPastMonth) {
      await report.save();
    }
  }

  // Return either the cached or newly computed report.
  return report;
}

module.exports = getOrCreateReport;
