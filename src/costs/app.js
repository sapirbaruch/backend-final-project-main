const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect-db');
const { logMiddleware } = require('../utils/logger');
const Cost = require('../models/cost-model');
const Report = require('../models/report-model');
const getOrCreateReport = require('../utils/get-or-create-report');
const User = require('../models/user-model');

dotenv.config();

const app = express();
app.use(express.json());

//++c: Log every HTTP request (required: logs written for every request)
app.use(logMiddleware);

//++c: Route - Add a new cost item to the costs collection
app.post('/api/add', async (req, res) => {
  try {
    const { description, category, userid, user_id, sum, createdAt } = req.body;

    //++c: Accept both 'userid' and 'user_id' (tests might send user_id)
    const userIdRaw = userid ?? user_id;

    //++c: Validate required fields (project requirement: validation for incoming data)
    if (!description || !category || userIdRaw === undefined || sum === undefined) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    const numericUserId = Number(userIdRaw);
    const numericSum = Number(sum);

    //++c: Validate numeric fields
    if (!Number.isFinite(numericUserId) || !Number.isFinite(numericSum)) {
      return res.status(400).json({ id: 400, message: 'Invalid numeric fields' });
    }

    //++c: Validate category using the required allowed list
    const allowedCategories = ['food', 'health', 'housing', 'sports', 'education'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ id: 400, message: 'Invalid category' });
    }

    //++c: Requirement - do not allow adding a cost for a non-existing user
    const userExists = await User.findOne({ id: numericUserId });
    if (!userExists) {
      return res.status(400).json({ id: 400, message: 'User not found' });
    }

    //++c: Requirement - reject costs with dates in the past
    let parsedCreatedAt;
    if (createdAt !== undefined && createdAt !== null && createdAt !== '') {
      parsedCreatedAt = new Date(createdAt);
      if (Number.isNaN(parsedCreatedAt.getTime())) {
        return res.status(400).json({ id: 400, message: 'Invalid createdAt' });
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (parsedCreatedAt < startOfToday) {
        return res.status(400).json({ id: 400, message: 'Cannot add cost in the past' });
      }
    }

    //++c: Create cost document (property names must match the costs collection schema)
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

//++c: Route - Get monthly report for a user/year/month
app.get('/api/report', async (req, res) => {
  const { user_id, id, year, month } = req.query;

  try {
    //++c: Parse and validate query params
    const userId = Number(user_id || id);
    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (!Number.isFinite(userId) || !Number.isFinite(numericYear) || !Number.isFinite(numericMonth)) {
      return res.status(400).json({ id: 400, message: 'Missing or invalid query parameters' });
    }

    //++c: Use Computed Design Pattern helper (compute on demand + cache past months)
    const report = await getOrCreateReport(userId, numericYear, numericMonth);

    //++c: Return only the required fields (avoid _id/__v)
    const plain = (report && typeof report.toObject === 'function') ? report.toObject() : report;

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

//++c: Route - Delete cost (used by unit tests cleanup)
app.delete('/removecost', async (req, res) => {
  try {
    const idToDelete = req.body.id || req.body._id;
    await Cost.deleteOne({ _id: idToDelete });
    return res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

//++c: Route - Delete report (used by unit tests cleanup)
app.delete('/removereport', async (req, res) => {
  try {
    const { user_id, year, month } = req.body;
    await Report.deleteOne({ userid: Number(user_id), year: Number(year), month: Number(month) });
    return res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

//++c: Deployment compatibility - prefer process.env.PORT (cloud providers)
const PORT = process.env.PORT || process.env.PORT_COSTS || 3002;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));
});
