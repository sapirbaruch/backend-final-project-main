const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect-db');
const { logMiddleware } = require('../utils/logger');
const User = require('../models/user-model');
const Cost = require('../models/cost-model');

dotenv.config();
const app = express();
app.use(express.json());
app.use(logMiddleware);

// Route: Add User
app.post('/api/add', async (req, res) => {
  try {
    const { id, first_name, last_name, birthday } = req.body;

    if (!id || !first_name || !last_name || !birthday) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    const userId = Number(id);
    if (isNaN(userId)) return res.status(400).json({ id: 400, message: 'Invalid id' });

    const exists = await User.findOne({ id: userId });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Normalize birthday string (remove ordinal suffixes like '12th' and commas) and parse to Date
    let parsedBirthday;
    if (birthday instanceof Date) {
      parsedBirthday = birthday;
    } else if (typeof birthday === 'string') {
      let cleaned = birthday.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
      cleaned = cleaned.replace(/,/g, ' ');
      parsedBirthday = new Date(cleaned);
      // Try ISO fallback
      if (isNaN(parsedBirthday.getTime())) {
        parsedBirthday = new Date(birthday.replace(/,/g, ''));
      }
    } else {
      parsedBirthday = new Date(birthday);
    }

    if (!parsedBirthday || isNaN(parsedBirthday.getTime())) {
      return res.status(400).json({ id: 400, message: "Invalid birthday format" });
    }

    const newUser = await User.create({ id: userId, first_name, last_name, birthday: parsedBirthday });
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

// Route: Get User Details
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const costs = await Cost.find({ userid: userId });
    let total = 0;
    costs.forEach(c => total += c.sum);

    res.json({ first_name: user.first_name, last_name: user.last_name, id: user.id, total });
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

// Route: List All Users (Requirement: GET /api/users)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-__v -_id');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

// Route: Delete User (Required for Tests)
app.delete('/removeuser', async (req, res) => {
    try {
        // remove all users with this id (tests expect clean up)
        await User.deleteMany({ id: Number(req.body.id) });
        res.json({ status: "success" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ id: 400, message: err.message });
    }
});

const PORT = process.env.PORT_USERS || 3001;
connectDb().then(() => {
    app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));
});