const Cost = require('../models/cost-model');
const isValidUser = require('../utils/is-valid-user');
const getOrCreateReport = require('../utils/get-or-create-report');

// Helper for required error format
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ id: statusCode, message });
};

// POST /api/addcost
const addExpense = async (req, res) => {
  // We check for both 'userid' (spec) and 'user_id' (test compatibility)
  const userid = req.body.userid || req.body.user_id;
  const { description, category, sum, year, month, day } = req.body;

  if (!userid || !description || !category || !sum) {
    return sendError(res, 400, 'Missing required fields');
  }

  // Validate User
  if (!(await isValidUser(userid))) {
    return sendError(res, 400, 'User not found');
  }

  // Default date to now if missing
  const date = new Date();
  const costItem = {
    userid,
    description,
    category,
    sum,
    year: year || date.getFullYear(),
    month: month || (date.getMonth() + 1),
    day: day || date.getDate(),
    id: new Date().getTime() // Simple ID generation
  };

  try {
    const newCost = await Cost.create(costItem);
    // Return properties matching the document names
    res.status(201).json(newCost);
  } catch (error) {
    sendError(res, 500, 'Internal server error');
  }
};

// GET /api/report
const getReport = async (req, res) => {
  const { user_id, year, month } = req.query; // Query usually uses user_id or id
  // Note: Your test sends 'user_id', spec often implies 'id'. We check both.
  const userid = user_id || req.query.id;

  if (!userid || !year || !month) {
    return sendError(res, 400, 'Missing parameters');
  }

  try {
    if (!(await isValidUser(userid))) {
      return sendError(res, 400, 'User not found');
    }
    const report = await getOrCreateReport(userid, parseInt(year), parseInt(month));
    res.json(report);
  } catch (error) {
    sendError(res, 500, 'Error generating report');
  }
};

module.exports = { addExpense, getReport };