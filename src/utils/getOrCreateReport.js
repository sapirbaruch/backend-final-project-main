const Report = require('../models/reportModel');
const Cost = require('../models/costModel');

/*
 * Computed Design Pattern (Project Requirement)
 *
 * The monthly report is computed on-demand from the "costs" collection:
 * 1) If a report already exists in the "reports" collection, return it.
 * 2) Otherwise, compute it by grouping cost items by category and mapping each
 *    item to { sum, description, day }.
 *
 * To reduce recomputation, the server caches reports ONLY for past months,
 * because the server does not allow adding costs with dates in the past.
 */

async function getOrCreateReport(userId, year, month) {
  //++c: Coerce input to numbers to avoid string/number mismatch
  const uid = Number(userId);
  const y = Number(year);
  const m = Number(month);

  //++c: Validate parameters
  if (isNaN(uid) || isNaN(y) || isNaN(m)) {
    throw new Error('Invalid report parameters');
  }

  //++c: If cached report exists (past month), return it
  let report = await Report.findOne({ userid: uid, year: y, month: m });

  if (!report) {
    //++c: Compute report from costs collection
    const costs = await Cost.find({ userid: uid, year: y, month: m });

    //++c: Required categories list
    const categories = ['food', 'health', 'housing', 'sports', 'education'];

    //++c: Required JSON structure: "costs" is an array of category objects
    const formattedCosts = categories.map((cat) => ({
      [cat]: costs
        .filter((c) => c.category === cat)
        .map((c) => ({
          sum: c.sum,
          description: c.description,
          day: c.day
        }))
    }));

    report = new Report({
      userid: uid,
      year: y,
      month: m,
      costs: formattedCosts
    });

    const now = new Date();
    const isPastMonth =
      (y < now.getFullYear()) ||
      (y === now.getFullYear() && m < (now.getMonth() + 1));

    //++c: Cache only if the requested month has already passed
    if (isPastMonth) {
      await report.save();
    }
  }

  return report;
}

module.exports = getOrCreateReport;
