const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');
const User = require('../models/user_model');
const Cost = require('../models/cost_model');

dotenv.config();

const app = express();
app.use(express.json());

// Log every incoming HTTP request
app.use(logMiddleware);

/*
 Shared handler for adding a new user.
 Supports both /api/add and /api/add/
*/
const addUserHandler = async (req, res) => {
  try {
    const { id, first_name, last_name, birthday } = req.body;

    // Validate required fields
    if (id === undefined || id === null || !first_name || !last_name || !birthday) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return res.status(400).json({ id: 400, message: 'Invalid id' });
    }

    // Prevent duplicate users
    const exists = await User.findOne({ id: numericId });
    if (exists) {
      return res.status(400).json({ id: 400, message: 'User already exists' });
    }

    // Parse birthday into Date
    const parsedBirthday = new Date(birthday);
    if (isNaN(parsedBirthday.getTime())) {
      return res.status(400).json({ id: 400, message: 'Invalid birthday format' });
    }

    const newUser = await User.create({
      id: numericId,
      first_name,
      last_name,
      birthday: parsedBirthday
    });

    return res.status(201).json(newUser.toObject({ versionKey: false, transform: function(doc, ret) { delete ret._id; return ret; } }));
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
};

// Add user (with and without trailing slash)
app.post('/api/add', addUserHandler);
app.post('/api/add/', addUserHandler);

/*
 Get details of a specific user including total costs
*/
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ id: 404, message: 'User not found' });
    }

    const costs = await Cost.find({ userid: userId });
    let total = 0;
    costs.forEach((c) => {
      total += c.sum;
    });

    return res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total: total.toFixed(2)
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 List all users
*/
app.get('/api/users', async (req, res) => {
  try {
    // Keep MongoDB _id and the logical user id separate
     const users = await User.find({}).select('-_id -__v');
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 Cleanup endpoint for tests only (NOT part of production API)
*/
if (process.env.NODE_ENV === 'test') {
  app.delete('/removeuser', async (req, res) => {
    try {
      await User.deleteMany({ id: Number(req.body.id) });
      return res.json({ status: 'success' });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ id: 400, message: err.message });
    }
  });
}

// Start server
const PORT = process.env.PORT || process.env.PORT_USERS || 3001;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));
});
