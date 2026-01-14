const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');
const Cost = require('../models/cost_model');
const Report = require('../models/report_model');
const getOrCreateReport = require('../utils/get_or_create_report');
const User = require('../models/user_model');

dotenv.config();

const app = express();
app.use(express.json());

// Log every HTTP request
app.use(logMiddleware);

/*
 Shared handler for adding a cost item.
 Supports both /api/add and /api/add/
*/
const addCostHandler = async (req, res) => {
  try {
    const { description, category, userid, user_id, sum, createdAt } = req.body;
    const rawUserId = userid ?? user_id;

    // Validate required fields
    if (!description || !category || rawUserId === undefined || sum === undefined) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    
    const numericUserId = Number(rawUserId);
   
    const numericSum = Number(sum);

    // Validate that conversions resulted in finite numbers
    if (!Number.isFinite(numericUserId) || !Number.isFinite(numericSum)) {
      return res.status(400).json({ id: 400, message: 'Invalid numeric fields' });
    }

    // Define allowed categories
    const allowedCategories = ['food', 'health', 'housing', 'sports', 'education'];
    
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ id: 400, message: 'Invalid category' });
    }

    // Verify that the user exists in the database
    const userExists = await User.findOne({ id: numericUserId });
    if (!userExists) {
      return res.status(400).json({ id: 400, message: 'User not found' });
    }

    // Handle optional createdAt parameter
    let parsedCreatedAt;
    if (createdAt) {
      
      parsedCreatedAt = new Date(createdAt);
      // Validate the date is valid
      if (isNaN(parsedCreatedAt.getTime())) {
        return res.status(400).json({ id: 400, message: 'Invalid createdAt' });
      }

      // Get today's date at start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Prevent adding costs in the past
      if (parsedCreatedAt < today) {
        return res.status(400).json({ id: 400, message: 'Cannot add cost in the past' });
      }
    }

    // Create the cost item in the database
    const costItem = await Cost.create({
      description,
      category,
      userid: numericUserId,
      sum: numericSum,
      ...(parsedCreatedAt ? { createdAt: parsedCreatedAt } : {})
    });

    // Return the created item without _id
    return res.status(201).json(costItem.toObject({ versionKey: false, transform: function(doc, ret) { delete ret._id; return ret; } }));
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
};

// Support both variants (with and without trailing slash)
app.post('/api/add', addCostHandler);
app.post('/api/add/', addCostHandler);

// Get monthly report
app.get('/api/report', async (req, res) => {
  try {
    const { id, user_id, year, month } = req.query;

    const userId = Number(user_id || id);
    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (!Number.isFinite(userId) || !Number.isFinite(numericYear) || !Number.isFinite(numericMonth)) {
      return res.status(400).json({ id: 400, message: 'Invalid query parameters' });
    }

    const report = await getOrCreateReport(userId, numericYear, numericMonth);

    return res.json({
      userid: report.userid,
      year: report.year,
      month: report.month,
      costs: report.costs
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

// Test cleanup endpoints only
if (process.env.NODE_ENV === 'test') {
  app.delete('/removecost', async (req, res) => {
    await Cost.deleteOne({ _id: req.body._id });
    res.json({ status: 'success' });
  });

  app.delete('/removereport', async (req, res) => {
    await Report.deleteOne({
      userid: Number(req.body.user_id),
      year: Number(req.body.year),
      month: Number(req.body.month)
    });
    res.json({ status: 'success' });
  });
}

const PORT = process.env.PORT || process.env.PORT_COSTS || 3002;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));
});
