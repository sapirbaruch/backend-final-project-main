const Report = require('../models/report-model');
const Cost = require('../models/cost-model');

/*
 * Computed Design Pattern:
 * Reports are generated on demand from costs.
 * Saved only for past months.
 */
async function getOrCreateReport(userId, year, month) {
  const uid = Number(userId);
  const y = Number(year);
  const m = Number(month);

  if (isNaN(uid) || isNaN(y) || isNaN(m)) {
    throw new Error('Invalid report parameters');
  }

  let report = await Report.findOne({ userid: uid, year: y, month: m });

  if (!report) {
    const costs = await Cost.find({ userid: uid, year: y, month: m });
    const categories = ['food', 'health', 'housing', 'sports', 'education'];

    const formattedCosts = categories.map(cat => ({
      [cat]: costs
        .filter(c => c.category === cat)
        .map(c => ({
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
      y < now.getFullYear() ||
      (y === now.getFullYear() && m < now.getMonth() + 1);

    if (isPastMonth) {
      await report.save();
    }
  }

  return report;
}

module.exports = getOrCreateReport;
