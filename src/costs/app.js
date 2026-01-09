const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect-db');
const { logMiddleware, logger } = require('../utils/logger');
const Cost = require('../models/cost-model');
const Report = require('../models/report-model');
const getOrCreateReport = require('../utils/get-or-create-report');
const User = require('../models/user-model');

dotenv.config();
const app = express();

app.use(express.json());
app.use(logMiddleware);

/*
 * POST /api/add
 * Adds a new cost item for an existing user.
 */
app.post('/api/add', async (req, res) => {
  logger.info('Endpoint accessed: POST /api/add');

  try {
    const { description, category, userid, user_id, sum, createdAt } = req.body;

    // Accept both userid and user_id (tests may use user_id)
    const userIdRaw = userid ?? user_id;

    if (!description || !category || userIdRaw === undefined || sum === undefined) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    const numericUserId = Number(userIdRaw);
    const numericSum = Number(sum);

    if (!Number.isFinite(numericUserId) || !Number.isFinite(numericSum)) {
      return res.status(400).json({ id: 400, message: 'Invalid numeric fields' });
    }

    // Validate category according to project requirements
    const allowedCategories = ['food', 'health', 'housing', 'sports', 'education'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ id: 400, message: 'Invalid category' });
    }

    // Verify that the user exists
    const userExists = await User.findOne({ id: numericUserId });
    if (!userExists) {
      return res.status(400).json({ id: 400, message: 'User not found' });
    }

    // Reject costs with a date in the past
    let parsedCreatedAt;
    if (createdAt) {
      parsedCreatedAt = new Date(createdAt);
      if (isNaN(parsedCreatedAt.getTime())) {
        return res.status(400).json({ id: 400, message: 'Invalid createdAt' });
      }

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (parsedCreatedAt < startOfToday) {
        return res.status(400).json({ id: 400, message: 'Cannot add cost in the past' });
      }
    }

    const costItem = await Cost.create({
      description,
      category,
      userid: numericUserId,
      sum: numericSum,
      ...(parsedCreatedAt ? { createdAt: parsedCreatedAt } : {})
    });

    return res.status(201).json(costItem);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 * GET /api/report
 * Returns a monthly report grouped by category.
 */
app.get('/api/report', async (req, res) => {
  logger.info('Endpoint accessed: GET /api/report');

  try {
    const { user_id, id, year, month } = req.query;

    const userId = Number(user_id || id);
    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (!Number.isFinite(userId) || !Number.isFinite(numericYear) || !Number.isFinite(numericMonth)) {
      return res.status(400).json({ id: 400, message: 'Missing or invalid query parameters' });
    }

    const report = await getOrCreateReport(userId, numericYear, numericMonth);

    const plain = report.toObject ? report.toObject() : report;

    return res.json({
      userid: plain.userid,
      year: plain.year,
      month: plain.month,
      costs: plain.costs
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 * DELETE /removecost
 * Required for automated tests cleanup.
 */
app.delete('/removecost', async (req, res) => {
  logger.info('Endpoint accessed: DELETE /removecost');

  try {
    const idToDelete = req.body.id || req.body._id;
    await Cost.deleteOne({ _id: idToDelete });
    return res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 * DELETE /removereport
 * Required for automated tests cleanup.
 */
app.delete('/removereport', async (req, res) => {
  logger.info('Endpoint accessed: DELETE /removereport');

  try {
    const { user_id, year, month } = req.body;
    await Report.deleteOne({
      userid: Number(user_id),
      year: Number(year),
      month: Number(month)
    });
    return res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

const PORT = process.env.PORT_COSTS || 3002;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));
});
