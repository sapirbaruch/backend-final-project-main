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
app.use(logMiddleware);

// Route: Add Cost
app.post('/api/add', async (req, res) => {
  try {
    const { description, category, userid, user_id, sum, year, month, day } = req.body;
    // Accept either 'userid' or 'user_id' (tests use user_id)
    const userId = userid || user_id;

    if (!description || !category || !userId || !sum) {
        return res.status(400).json({ id: 400, message: "Missing required fields" });
    }

    const numericUserId = Number(userId);
    const numericSum = Number(sum);
    if (isNaN(numericUserId) || isNaN(numericSum)) {
      return res.status(400).json({ id: 400, message: 'Invalid numeric fields' });
    }

    // Verify user exists (requirement: must validate user exists)
    const userExists = await User.findOne({ id: numericUserId });
    if (!userExists) {
      return res.status(400).json({ id: 400, message: 'User not found' });
    }

    const today = new Date();
    // Normalize provided date parts or default to today
    const numericYear = year ? Number(year) : today.getFullYear();
    const numericMonth = month ? Number(month) : (today.getMonth() + 1);
    const numericDay = day ? Number(day) : today.getDate();

    if (isNaN(numericYear) || isNaN(numericMonth) || isNaN(numericDay)) {
      return res.status(400).json({ id: 400, message: 'Invalid date fields' });
    }

    const providedDate = new Date(numericYear, numericMonth - 1, numericDay);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Requirement: do not allow adding costs with dates that belong to the past
    if (providedDate < startOfToday) {
      return res.status(400).json({ id: 400, message: 'Cannot add cost in the past' });
    }

    const costItem = await Cost.create({
       description, category, userid: numericUserId, sum: numericSum,
       year: numericYear,
       month: numericMonth,
       day: numericDay
    });
    res.status(201).json(costItem);
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

// Route: Monthly Report
app.get('/api/report', async (req, res) => {
  const { user_id, id, year, month } = req.query;
  try {
    const userId = Number(user_id || id);
    const numericYear = Number(year);
    const numericMonth = Number(month);
    if (isNaN(userId) || isNaN(numericYear) || isNaN(numericMonth)) {
      return res.status(400).json({ id: 400, message: 'Missing or invalid query parameters' });
    }
    const report = await getOrCreateReport(userId, numericYear, numericMonth);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

// Route: Delete Cost (Required for Tests)
app.delete('/removecost', async (req, res) => {
    try {
        // Handle both 'id' (from simple JSON) and '_id'
        const idToDelete = req.body.id || req.body._id;
        await Cost.deleteOne({ _id: idToDelete });
        res.json({ status: "success" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ id: 400, message: err.message });
    }
});

// Route: Delete Report (Required for Tests)
app.delete('/removereport', async (req, res) => {
    try {
        const { user_id, year, month } = req.body;
        await Report.deleteOne({ userid: Number(user_id), year: Number(year), month: Number(month) });
        res.json({ status: "success" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ id: 400, message: err.message });
    }
});

const PORT = process.env.PORT_COSTS || 3002;
connectDb().then(() => {
    app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));
});