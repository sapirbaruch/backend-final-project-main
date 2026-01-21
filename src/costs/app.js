// Costs service: validates and records cost entries and provides monthly reports.
const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');
const Cost = require('../models/cost_model');
const Report = require('../models/report_model');
const getOrCreateReport = require('../utils/get_or_create_report');
// User model is used to validate that costs are linked to an existing user.
const User = require('../models/user_model');

dotenv.config();

// Create Express application and enable JSON request body parsing.
const app = express();
app.use(express.json());

// Middleware: log every HTTP request as required by the project specification.
app.use(logMiddleware);

/*
 Shared handler for adding a cost item.
 Supports both /api/add and /api/add/ endpoints.
*/
const addCostHandler = async (req, res) => {
  try {
    // Extract cost fields from request body (support both userid and user_id).
    const { description, category, userid, user_id, sum, createdAt } = req.body;
    const rawUserId = userid ?? user_id;

    // Validate presence of mandatory fields before any processing.
    if (!description || !category || rawUserId === undefined || sum === undefined) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    // Convert user id and sum to numbers and validate numeric correctness.
    const numericUserId = Number(rawUserId);
    const numericSum = Number(sum);

    if (!Number.isFinite(numericUserId) || !Number.isFinite(numericSum)) {
      return res.status(400).json({ id: 400, message: 'Invalid numeric fields' });
    }

    // Validate category against the predefined list required by the assignment.
    const allowedCategories = ['food', 'health', 'housing', 'sports', 'education'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ id: 400, message: 'Invalid category' });
    }

    // Verify that the referenced user exists in the users collection.
    const userExists = await User.findOne({ id: numericUserId });
    if (!userExists) {
      return res.status(400).json({ id: 400, message: 'User not found' });
    }

    // Optional createdAt handling: validate date and ensure it is not in the past.
    let parsedCreatedAt;
    if (createdAt) {
      parsedCreatedAt = new Date(createdAt);
      if (isNaN(parsedCreatedAt.getTime())) {
        return res.status(400).json({ id: 400, message: 'Invalid createdAt' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (parsedCreatedAt < today) {
        return res.status(400).json({ id: 400, message: 'Cannot add cost in the past' });
      }
    }

    // Persist the new cost item in the database.
    const costItem = await Cost.create({
      description,
      category,
      userid: numericUserId,
      sum: numericSum,
      ...(parsedCreatedAt ? { createdAt: parsedCreatedAt } : {})
    });

    // Return the created cost item while removing MongoDB internal fields.
    return res.status(201).json(
      costItem.toObject({
        versionKey: false,
        transform: function (doc, ret) {
          delete ret._id;
          return ret;
        }
      })
    );
  } catch (err) {
    // Catch validation or database errors and return a consistent error response.
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
};

// Register add-cost endpoint (with and without trailing slash).
app.post('/api/add', addCostHandler);
app.post('/api/add/', addCostHandler);

/*
 Shared handler for generating or retrieving a monthly cost report.
 Supports /api/report and /api/report/.
*/
const reportHandler = async (req, res) => {
  try {
    // Extract and normalize query parameters (support id and user_id).
    const { id, user_id, year, month } = req.query;

    const userId = Number(user_id || id);
    const numericYear = Number(year);
    const numericMonth = Number(month);

    // Validate that all query parameters are valid numbers.
    if (!Number.isFinite(userId) || !Number.isFinite(numericYear) || !Number.isFinite(numericMonth)) {
      return res.status(400).json({ id: 400, message: 'Invalid query parameters' });
    }

    // Retrieve cached report or compute a new one if it does not exist.
    const report = await getOrCreateReport(userId, numericYear, numericMonth);

    // Return report data in the format required by the assignment.
    return res.json({
      userid: report.userid,
      year: report.year,
      month: report.month,
      costs: report.costs
    });
  } catch (err) {
    // Handle report computation or database errors.
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
};

// Register report endpoints (with and without trailing slash).
app.get('/api/report', reportHandler);
app.get('/api/report/', reportHandler);

// Test-only cleanup endpoints used by automated tests.
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

// Select port from environment variables with a fallback for local development.
const PORT = process.env.PORT || process.env.PORT_COSTS || 3002;

// Connect to MongoDB and start the service only after successful connection.
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));
});
